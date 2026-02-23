'use client';

import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type { PublisherPost, PublisherChannel, PublisherAsset } from '@/lib/types/database';

const POSTS_STORAGE_KEY = 'pulse_posts';
const CHANNELS_STORAGE_KEY = 'pulse_channels';
const ASSETS_STORAGE_KEY = 'pulse_assets';

// ─── Startup cleanup: purge bloated base64 data from localStorage ────
if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY);
    if (raw && raw.length > 500_000) {
      // Data is over 500KB — almost certainly contains base64 images
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const posts = JSON.parse(raw) as any[];
      const cleaned = posts.map((p) => ({
        ...p,
        visual_variants: (p.visual_variants || []).map((v: Record<string, unknown>) => {
          if (typeof v?.dataUrl === 'string' && (v.dataUrl as string).length > 1000) {
            const { dataUrl, ...rest } = v;
            return rest;
          }
          return v;
        }),
      }));
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(cleaned));
      console.info('[pulse] Cleaned bloated localStorage (was', (raw.length / 1024).toFixed(0), 'KB)');
    }
  } catch {
    // If even reading/parsing fails, nuke it
    try { localStorage.removeItem(POSTS_STORAGE_KEY); } catch { /* ignore */ }
  }
}

// Default channels for localStorage fallback
const DEFAULT_CHANNELS: PublisherChannel[] = [
  { id: '1', name: 'Infinite Authority', product_code: 'ia', status: 'public', governance_profile: 'strict', allowed_platforms: ['instagram', 'linkedin', 'twitter'], cadence_rules: {}, asset_requirements: { static_requires_image: true }, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '2', name: 'QuoteKits', product_code: 'quotekits', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'pinterest', 'twitter'], cadence_rules: {}, asset_requirements: { static_requires_image: true }, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '3', name: 'ChaosCut', product_code: 'chaoscut', status: 'public', governance_profile: 'experimental', allowed_platforms: ['tiktok', 'instagram', 'youtube'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '4', name: 'ContextEmbed', product_code: 'contextembed', status: 'public', governance_profile: 'strict', allowed_platforms: ['linkedin', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '5', name: 'ShootCleaner', product_code: 'shootcleaner', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'youtube'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '6', name: 'BatchLight', product_code: 'batchlight', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '7', name: 'TogNinja', product_code: 'togninja', status: 'public', governance_profile: 'experimental', allowed_platforms: ['twitter', 'linkedin'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '8', name: 'SiteFixEngine', product_code: 'sitefixengine', status: 'public', governance_profile: 'strict', allowed_platforms: ['linkedin', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
  { id: '9', name: 'Asset Liberator', product_code: 'assetliberator', status: 'public', governance_profile: 'standard', allowed_platforms: ['instagram', 'twitter'], cadence_rules: {}, asset_requirements: {}, default_timezone: 'UTC', default_schedule_time: '09:00', brand_pack_id: null, ai_daily_cap: 50, archived_at: null, created_at: '', updated_at: '' },
];

type PostWithChannel = PublisherPost & { channel_name?: string; channel_code?: string };

// LocalStorage helpers
function getLocalPosts(): PostWithChannel[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(POSTS_STORAGE_KEY);
    if (!stored) return [];
    const posts: PostWithChannel[] = JSON.parse(stored);

    // Auto-clean bloated base64 data from previous sessions
    let needsCleanup = false;
    const cleaned = posts.map((p) => {
      if (!p.visual_variants?.length) return p;
      const variants = p.visual_variants.map((v) => {
        if (v?.dataUrl && v.dataUrl.length > 1000 && !v.dataUrl.startsWith('placeholder:')) {
          needsCleanup = true;
          const { dataUrl, ...rest } = v;
          return { ...rest, dataUrl: `placeholder:ai-${v.platformKey || 'img'}` };
        }
        return v;
      });
      return { ...p, visual_variants: variants };
    });

    if (needsCleanup) {
      try {
        localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(cleaned));
        console.info('Cleaned bloated base64 data from localStorage');
      } catch {
        // Last resort: strip all variants entirely
        const minimal = cleaned.map((p) => ({ ...p, visual_variants: [] }));
        try {
          localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(minimal));
        } catch {
          localStorage.removeItem(POSTS_STORAGE_KEY);
        }
      }
    }

    return cleaned;
  } catch {
    return [];
  }
}

function setLocalPosts(posts: PostWithChannel[]): void {
  if (typeof window === 'undefined') return;
  // Strip large base64 dataUrl from visual_variants to avoid exceeding localStorage quota.
  // AI-generated images are kept in React state (in-memory) for the current session.
  const stripped = posts.map((p) => ({
    ...p,
    visual_variants: (p.visual_variants || []).map((v) => {
      if (v?.dataUrl && v.dataUrl.length > 1000) {
        const { dataUrl, ...rest } = v;
        return { ...rest, dataUrl: `placeholder:ai-${v.platformKey || 'img'}` };
      }
      return v;
    }),
  }));
  try {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(stripped));
  } catch (e) {
    // If still too large, strip all dataUrls entirely
    const minimal = stripped.map((p) => ({
      ...p,
      visual_variants: (p.visual_variants || []).map((v) => {
        const { dataUrl, ...rest } = v;
        return rest;
      }),
    }));
    try {
      localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      console.warn('localStorage quota exceeded even after stripping variants');
    }
  }
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

export async function fetchPost(id: string): Promise<PostWithChannel | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_posts')
        .select(`
          *,
          channel:publisher_channels(name, product_code)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const post = data as PublisherPost & { channel?: { name: string; product_code: string } };
      return {
        ...post,
        channel_name: post.channel?.name,
        channel_code: post.channel?.product_code,
      };
    } catch (error) {
      console.error('Error fetching post from Supabase:', error);
      // Fall through to localStorage
    }
  }

  const posts = getLocalPosts();
  return posts.find(p => p.id === id) || null;
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
      visual_handling: 'single',
      media_aspect_ratio: null,
      media_risk_by_platform: {},
      visual_variants: [],
      visual_variant_mode: 'auto',
      variant_generation_status: 'idle',
      variant_last_generated_at: null,
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
  // Fields that only exist client-side (not in Supabase schema)
  const CLIENT_ONLY_FIELDS = [
    'media_aspect_ratio', 'media_risk_by_platform', 'visual_variants',
    'visual_variant_mode', 'variant_generation_status', 'variant_last_generated_at',
    'visual_handling', 'channel_name', 'channel_code',
    // Phase 4: stored locally; build-variants API gets them from request body
    'source_image', 'selected_platforms', 'variant_strategy',
  ];

  if (isSupabaseConfigured()) {
    try {
      // Filter out client-only fields before sending to Supabase
      const supabaseUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => !CLIENT_ONLY_FIELDS.includes(key))
      );

      // Only send to Supabase if there are server-relevant fields to update
      if (Object.keys(supabaseUpdates).length > 0) {
        const { data, error } = await supabase
          .from('publisher_posts')
          .update(supabaseUpdates)
          .eq('id', id)
          .select(`
            *,
            channel:publisher_channels(name, product_code)
          `)
          .single();

        if (error) throw error;
        
        const post = data as PublisherPost & { channel?: { name: string; product_code: string } };
        // Also save to localStorage to preserve client-only fields
        const fullPost = { ...post, ...updates, channel_name: post.channel?.name, channel_code: post.channel?.product_code };
        savePostToLocalStorage(id, fullPost);
        return fullPost;
      }
    } catch (error) {
      console.error('Error updating post in Supabase:', error);
    }
  }
  
  // Update in localStorage (always, as fallback or for client-only fields)
  return savePostToLocalStorage(id, updates);
}

function savePostToLocalStorage(id: string, updates: Partial<PublisherPost>): PostWithChannel | null {
  const posts = getLocalPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) {
    // Post exists in Supabase but not localStorage — create a local entry
    const newLocalPost: PostWithChannel = {
      id,
      channel_id: '',
      date: '',
      scheduled_at: null,
      platform_targets: [],
      content_type: 'static',
      theme: null,
      caption: '',
      cta: null,
      hashtags: null,
      status: 'draft',
      governance_status: 'unreviewed',
      governance_score: 0,
      governance_refusals: [],
      governance_unlock_path: null,
      visual_handling: 'single',
      media_aspect_ratio: null,
      media_risk_by_platform: {},
      visual_variants: [],
      visual_variant_mode: 'auto',
      variant_generation_status: 'idle',
      variant_last_generated_at: null,
      // Phase 4 defaults
      source_image: null,
      selected_platforms: [],
      variant_strategy: 'single_image',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    };
    posts.push(newLocalPost);
    setLocalPosts(posts);
    return newLocalPost;
  }
  
  posts[index] = { ...posts[index], ...updates, updated_at: new Date().toISOString() };
  setLocalPosts(posts);
  return posts[index];
}

// Storage mode indicator
export function getStorageMode(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

// ─── Asset Storage ───────────────────────────────────────────────

interface StoredAsset extends Omit<PublisherAsset, 'storage_path'> {
  storage_path: string; // base64 data URL for localStorage
}

function getLocalAssets(): StoredAsset[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ASSETS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setLocalAssets(assets: StoredAsset[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ASSETS_STORAGE_KEY, JSON.stringify(assets));
}

export async function fetchAssets(postId: string): Promise<PublisherAsset[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_assets')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching assets from Supabase:', error);
    }
  }

  return getLocalAssets().filter((a) => a.post_id === postId);
}

export async function fetchAllAssets(): Promise<PublisherAsset[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_assets')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all assets from Supabase:', error);
    }
  }

  return getLocalAssets();
}

export async function saveAsset(asset: PublisherAsset, fileDataUrl: string): Promise<PublisherAsset> {
  const stored: StoredAsset = { ...asset, storage_path: fileDataUrl };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('publisher_assets')
        .insert(asset)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving asset to Supabase:', error);
    }
  }

  const existing = getLocalAssets();
  setLocalAssets([...existing, stored]);
  return { ...asset, storage_path: fileDataUrl };
}

export async function deleteAsset(assetId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('publisher_assets')
        .delete()
        .eq('id', assetId);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Error deleting asset from Supabase:', error);
    }
  }

  const assets = getLocalAssets();
  setLocalAssets(assets.filter((a) => a.id !== assetId));
}

export async function updateAssetRole(assetId: string, role: PublisherAsset['role']): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('publisher_assets')
        .update({ role })
        .eq('id', assetId);

      if (error) throw error;
      return;
    } catch (error) {
      console.error('Error updating asset in Supabase:', error);
    }
  }

  const assets = getLocalAssets();
  const idx = assets.findIndex((a) => a.id === assetId);
  if (idx !== -1) {
    assets[idx].role = role;
    setLocalAssets(assets);
  }
}
