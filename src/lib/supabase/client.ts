import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
const isConfigured: boolean = !!(supabaseUrl && supabaseAnonKey);

if (!isConfigured) {
  console.warn(
    'Supabase environment variables not set. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

// Create a placeholder client for build time
// This will only work at runtime when env vars are set
export const supabase: SupabaseClient = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Server-side client with service role (for admin operations)
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Helper to check if Supabase is available
export function isSupabaseConfigured(): boolean {
  return isConfigured;
}
