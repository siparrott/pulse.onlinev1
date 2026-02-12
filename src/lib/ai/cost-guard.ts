/**
 * Phase 3A: Cost Guard
 *
 * Three gates checked BEFORE processing any generation job:
 *   1. AI_KILL_SWITCH=true  → hard block ALL generation
 *   2. Per-channel daily cap → publisher_channels.ai_daily_cap
 *   3. Global daily cap     → AI_DAILY_LIMIT env var (default 500)
 *
 * Server-side only — called from the worker and from the enqueue route.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CostGuardResult {
  allowed: boolean;
  reason?: string;
  code?: 'kill_switch' | 'channel_cap' | 'global_cap';
}

/**
 * Check all three cost gates.
 * Returns { allowed: true } if the request should proceed.
 */
export async function checkCostGuard(
  supabase: SupabaseClient,
  channelId: string
): Promise<CostGuardResult> {
  // ── Gate 1: Kill switch ────────────────────────────
  if (process.env.AI_KILL_SWITCH === 'true') {
    return {
      allowed: false,
      reason: 'AI generation is temporarily disabled (kill switch active)',
      code: 'kill_switch',
    };
  }

  // ── Gate 2: Per-channel daily cap ──────────────────
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Get channel's cap (default 50)
  const { data: channel } = await supabase
    .from('publisher_channels')
    .select('ai_daily_cap')
    .eq('id', channelId)
    .single();

  const channelCap = channel?.ai_daily_cap ?? 50;

  // Get today's usage for this channel
  const { data: quota } = await supabase
    .from('generation_quotas')
    .select('count')
    .eq('channel_id', channelId)
    .eq('date', today)
    .single();

  const channelUsage = quota?.count ?? 0;

  if (channelUsage >= channelCap) {
    return {
      allowed: false,
      reason: `Channel daily limit reached (${channelUsage}/${channelCap}). Resets at midnight UTC.`,
      code: 'channel_cap',
    };
  }

  // ── Gate 3: Global daily cap ───────────────────────
  const globalLimit = parseInt(process.env.AI_DAILY_LIMIT || '500', 10);

  // Count ALL done jobs today across all channels
  const { count: globalUsage } = await supabase
    .from('generation_jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'done')
    .gte('created_at', `${today}T00:00:00Z`);

  if ((globalUsage ?? 0) >= globalLimit) {
    return {
      allowed: false,
      reason: `Global daily limit reached (${globalUsage}/${globalLimit}). Resets at midnight UTC.`,
      code: 'global_cap',
    };
  }

  return { allowed: true };
}

/**
 * Increment the per-channel daily quota counter.
 * Called by the worker after a successful generation.
 */
export async function incrementQuota(
  supabase: SupabaseClient,
  channelId: string
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);

  // Upsert: create today's row or increment existing
  const { data: existing } = await supabase
    .from('generation_quotas')
    .select('id, count')
    .eq('channel_id', channelId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase
      .from('generation_quotas')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('generation_quotas')
      .insert({ channel_id: channelId, date: today, count: 1 });
  }
}
