'use client';

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { PublisherPost, PublisherChannel } from '@/lib/types/database';

const POSTS_STORAGE_KEY = 'pulse_posts';
const CHANNELS_STORAGE_KEY = 'pulse_channels';

// Default channels for localStorage fallback
const DEFAULT_CHANNELS: PublisherChannel[] = [
  { id: '1', name: 'Infinite Authority', product_code: 'ia', status: 'public', governance_profile: 'strict', allowed_platforms: ['instagram', 'linkedin', 'twitter'], cadence_rules: {}, asset_requirements: { static_requires_image: true }, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '2', name: 'QuoteKits', product_code: 'quotekits', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'pinterest', 'twitter'], cadence_rules: {}, asset_requirements: { static_requires_image: true }, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '3', name: 'ChaosCut', product_code: 'chaoscut', status: 'public', governance_profile: 'experimental', allowed_platforms: ['tiktok', 'instagram', 'youtube'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '4', name: 'ContextEmbed', product_code: 'contextembed', status: 'public', governance_profile: 'strict', allowed_platforms: ['linkedin', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '5', name: 'ShootCleaner', product_code: 'shootcleaner', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'youtube'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '6', name: 'BatchLight', product_code: 'batchlight', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '7', name: 'TogNinja', product_code: 'togninja', status: 'public', governance_profile: 'experimental', allowed_platforms: ['twitter', 'linkedin'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '8', name: 'SiteFixEngine', product_code: 'sitefixengine', status: 'public', governance_profile: 'strict', allowed_platforms: ['linkedin', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
  { id: '9', name: 'Asset Liberator', product_code: 'assetliberator', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', archived_at: null, created_at: '', updated_at: '' },
];

type PostWithChannel = PublisherPost & { channel_name?: string; channel_code?: string };

// LocalStorage helpers
function getLocalPosts(): PostWithChannel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalPosts(posts: PostWithChannel[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

function getLocalChannels(): PublisherChannel[] {
  if (typeof window === 'undefined') return DEFAULT_CHANNELS;
  try {
    const stored = localStorage.getItem(CHANNELS_STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(CHANNELS_STORAGE_KEY, JSON.stringify(DEFAULT_CHANNELS));
      return DEFAULT_CHANNELS;
    }
    return JSON.parse(stored);
  } catch {
    return DEFAULT_CHANNELS;
  }
}

// Main storage API
export async function fetchPosts(): Promise<PostWithChannel[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_posts')
        .select(`
          *,
          channel:publisher_channels(name, product_code)
        `)
        .order('date', { ascending: true });

      if (error) throw error;
      
      return (data || []).map((post: PublisherPost & { channel?: { name: string; product_code: string } }) => ({
        ...post,
        channel_name: post.channel?.name,
        channel_code: post.channel?.product_code,
      }));
    } catch (error) {
      console.error('Error fetching posts from Supabase:', error);
      return getLocalPosts();
    }
  }
  
  return getLocalPosts();
}

export async function fetchChannels(): Promise<PublisherChannel[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_channels')
        .select('*')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching channels from Supabase:', error);
      return getLocalChannels();
    }
  }
  
  return getLocalChannels();
}

export async function savePosts(posts: Partial<PublisherPost>[]): Promise<PostWithChannel[]> {
  const channels = await fetchChannels();
  const now = new Date().toISOString();
  
  const newPosts: PostWithChannel[] = posts.map((post, index) => {
    const channel = channels.find(c => c.id === post.channel_id);
    return {
      id: `local-${Date.now()}-${index}`,
      channel_id: post.channel_id || '',
      date: post.date || '',
      scheduled_at: post.scheduled_at || null,
      platform_targets: post.platform_targets || [],
      content_type: post.content_type || 'static',
      theme: post.theme || null,
      caption: post.caption || '',
      cta: post.cta || null,
      hashtags: post.hashtags || null,
      status: 'draft',
      governance_status: 'unreviewed',
      governance_score: 0,
      governance_refusals: [],
      governance_unlock_path: null,
      created_at: now,
      updated_at: now,
      channel_name: channel?.name,
      channel_code: channel?.product_code,
    };
  });

  if (isSupabaseConfigured()) {
    try {
      const postsToInsert = posts.map((post) => ({
        ...post,
        status: 'draft',
        governance_status: 'unreviewed',
        governance_score: 0,
        governance_refusals: [],
      }));

      const { data, error } = await supabase
        .from('publisher_posts')
        .insert(postsToInsert)
        .select(`
          *,
          channel:publisher_channels(name, product_code)
        `);

      if (error) throw error;
      
      return (data || []).map((post: PublisherPost & { channel?: { name: string; product_code: string } }) => ({
        ...post,
        channel_name: post.channel?.name,
        channel_code: post.channel?.product_code,
      }));
    } catch (error) {
      console.error('Error saving posts to Supabase:', error);
      // Fall back to localStorage
    }
  }
  
  // Save to localStorage
  const existingPosts = getLocalPosts();
  const allPosts = [...existingPosts, ...newPosts];
  setLocalPosts(allPosts);
  return newPosts;
}

export async function deletePost(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('publisher_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Error deleting post from Supabase:', error);
    }
  }
  
  // Delete from localStorage
  const posts = getLocalPosts();
  const filtered = posts.filter(p => p.id !== id);
  setLocalPosts(filtered);
}

export async function updatePost(id: string, updates: Partial<PublisherPost>): Promise<PostWithChannel | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_posts')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          channel:publisher_channels(name, product_code)
        `)
        .single();

      if (error) throw error;
      
      const post = data as PublisherPost & { channel?: { name: string; product_code: string } };
      return {
        ...post,
        channel_name: post.channel?.name,
        channel_code: post.channel?.product_code,
      };
    } catch (error) {
      console.error('Error updating post in Supabase:', error);
    }
  }
  
  // Update in localStorage
  const posts = getLocalPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  posts[index] = { ...posts[index], ...updates, updated_at: new Date().toISOString() };
  setLocalPosts(posts);
  return posts[index];
}

// Storage mode indicator
export function getStorageMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}
