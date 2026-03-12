/**
 * Phase 3A: Cost Guard Tests
 *
 * Tests the 3-gate cost control system:
 *   1. AI_KILL_SWITCH → block all
 *   2. Per-channel daily cap → block when exceeded
 *   3. Global daily cap → block when exceeded
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkCostGuard } from '@/lib/ai/cost-guard';

// Mock Supabase client
function createMockSupabase(overrides: {
  channelCap?: number | null;
  channelUsage?: number | null;
  globalUsage?: number | null;
} = {}) {
  const { channelCap = 50, channelUsage = 0, globalUsage = 0 } = overrides;

  return {
    from: vi.fn((table: string) => {
      if (table === 'publisher_channels') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: channelCap !== null ? { ai_daily_cap: channelCap } : null,
            error: null,
          }),
        };
      }
      if (table === 'generation_quotas') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: channelUsage !== null ? { count: channelUsage } : null,
            error: null,
          }),
          upsert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === 'generation_jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            gte: vi.fn().mockResolvedValue({
              count: globalUsage,
              error: null,
            }),
          }),
        };
      }
      return {};
    }),
  } as unknown as Parameters<typeof checkCostGuard>[0];
}

describe('checkCostGuard', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('blocks when AI_KILL_SWITCH is true', async () => {
    process.env.AI_KILL_SWITCH = 'true';
    const supabase = createMockSupabase();

    const result = await checkCostGuard(supabase, 'ch-1');

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('kill_switch');
  });

  it('allows when kill switch is false and under limits', async () => {
    process.env.AI_KILL_SWITCH = 'false';
    process.env.AI_DAILY_LIMIT = '500';
    const supabase = createMockSupabase({
      channelCap: 50,
      channelUsage: 5,
      globalUsage: 10,
    });

    const result = await checkCostGuard(supabase, 'ch-1');

    expect(result.allowed).toBe(true);
  });

  it('blocks when channel cap is reached', async () => {
    process.env.AI_KILL_SWITCH = 'false';
    const supabase = createMockSupabase({
      channelCap: 50,
      channelUsage: 50,
      globalUsage: 100,
    });

    const result = await checkCostGuard(supabase, 'ch-1');

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('channel_cap');
    expect(result.reason).toContain('50/50');
  });

  it('blocks when global cap is reached', async () => {
    process.env.AI_KILL_SWITCH = 'false';
    process.env.AI_DAILY_LIMIT = '100';
    const supabase = createMockSupabase({
      channelCap: 50,
      channelUsage: 5,
      globalUsage: 100,
    });

    const result = await checkCostGuard(supabase, 'ch-1');

    expect(result.allowed).toBe(false);
    expect(result.code).toBe('global_cap');
  });

  it('defaults channel cap to 50 when not set', async () => {
    process.env.AI_KILL_SWITCH = 'false';
    process.env.AI_DAILY_LIMIT = '1000';
    const supabase = createMockSupabase({
      channelCap: null, // Not found in DB
      channelUsage: 49,
      globalUsage: 10,
    });

    const result = await checkCostGuard(supabase, 'ch-1');

    // Should still be allowed — 49 < 50 default
    expect(result.allowed).toBe(true);
  });

  it('defaults global limit to 500 when env not set', async () => {
    process.env.AI_KILL_SWITCH = 'false';
    delete process.env.AI_DAILY_LIMIT;
    const supabase = createMockSupabase({
      channelCap: 50,
      channelUsage: 5,
      globalUsage: 499,
    });

    const result = await checkCostGuard(supabase, 'ch-1');

    expect(result.allowed).toBe(true);
  });
});
