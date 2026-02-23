/**
 * Phase 6: Daily Engagement Digest Generator
 *
 * Summarizes the last 24h of engagement for a user:
 * - Top 3 posts by delta views/engagement
 * - Spikes/milestones detected
 * - Ingestion errors needing attention
 *
 * Returns both markdown string and structured JSON.
 */

import { createServerClient } from '@/lib/supabase/client';

export interface DigestSummary {
  date: string;
  userId: string;
  topPosts: Array<{
    deliveryId: string;
    platformId: string;
    postTitle: string;
    deltaViews: number;
    deltaEngagements: number;
    totalViews: number;
    totalLikes: number;
  }>;
  events: Array<{
    type: string;
    platformId: string;
    description: string;
    occurredAt: string;
  }>;
  errors: Array<{
    deliveryId: string;
    platformId: string;
    error: string;
  }>;
  totalDeliveries: number;
  healthyDeliveries: number;
}

export async function generateDailyDigest(
  date: string = new Date().toISOString().slice(0, 10),
  userId: string = 'default'
): Promise<{ summary: DigestSummary; markdown: string }> {
  const supabase = createServerClient();

  const dayStart = `${date}T00:00:00.000Z`;
  const dayEnd = `${date}T23:59:59.999Z`;

  // 1) Get rollups with 24h deltas
  const { data: rollups } = await supabase
    .from('engagement_rollups')
    .select(`
      post_delivery_id, platform_id, totals, deltas_24h, last_captured_at,
      delivery:post_deliveries (
        id, caption,
        schedule:post_schedules (
          post:publisher_posts ( id, title )
        )
      )
    `)
    .eq('user_id', userId);

  // Sort by delta views descending
  const withDeltas = (rollups || [])
    .map((r) => {
      const d = r.deltas_24h as Record<string, number | null>;
      const t = r.totals as Record<string, number | null>;
      const delivery = r.delivery as unknown as Record<string, unknown> | null;
      const schedule = delivery?.schedule as unknown as Record<string, unknown> | null;
      const post = schedule?.post as unknown as Record<string, unknown> | null;
      return {
        deliveryId: r.post_delivery_id,
        platformId: r.platform_id,
        postTitle: (post?.title as string) || (delivery?.caption as string)?.slice(0, 50) || '—',
        deltaViews: d?.views ?? 0,
        deltaEngagements: (d?.likes ?? 0) + (d?.comments ?? 0) + (d?.shares ?? 0),
        totalViews: t?.views ?? 0,
        totalLikes: t?.likes ?? 0,
      };
    })
    .sort((a, b) => b.deltaViews - a.deltaViews);

  const topPosts = withDeltas.slice(0, 3);

  // 2) Events from today
  const { data: events } = await supabase
    .from('user_engagement_events')
    .select('*')
    .eq('user_id', userId)
    .gte('occurred_at', dayStart)
    .lte('occurred_at', dayEnd)
    .order('occurred_at', { ascending: false })
    .limit(20);

  const eventSummaries = (events || []).map((e) => {
    const payload = e.payload as Record<string, unknown>;
    let description = '';
    if (e.type === 'spike') {
      description = `${payload.field} spiked ${payload.deltaPct}%`;
    } else if (e.type === 'milestone') {
      description = `${payload.field} reached ${payload.threshold}`;
    } else if (e.type === 'error') {
      description = `Ingestion error: ${payload.error}`;
    }
    return {
      type: e.type,
      platformId: e.platform_id || '',
      description,
      occurredAt: e.occurred_at,
    };
  });

  // 3) Recent errors
  const { data: errorSnapshots } = await supabase
    .from('engagement_snapshots')
    .select('post_delivery_id, platform_id, error')
    .eq('user_id', userId)
    .eq('ok', false)
    .gte('captured_at', dayStart)
    .lte('captured_at', dayEnd)
    .limit(10);

  const errors = (errorSnapshots || []).map((s) => ({
    deliveryId: s.post_delivery_id,
    platformId: s.platform_id,
    error: s.error || 'Unknown error',
  }));

  // 4) Health check
  const totalDeliveries = rollups?.length ?? 0;
  const healthyDeliveries = totalDeliveries - errors.length;

  const summary: DigestSummary = {
    date,
    userId,
    topPosts,
    events: eventSummaries,
    errors,
    totalDeliveries,
    healthyDeliveries,
  };

  // Generate markdown
  const lines: string[] = [];
  lines.push(`# Daily Engagement Digest — ${date}`);
  lines.push('');

  if (topPosts.length > 0) {
    lines.push('## Top Performing Posts');
    for (const p of topPosts) {
      lines.push(`- **${p.postTitle}** (${p.platformId}) — ${p.totalViews} views (+${p.deltaViews} today), ${p.totalLikes} likes`);
    }
    lines.push('');
  }

  if (eventSummaries.length > 0) {
    lines.push('## Events');
    for (const e of eventSummaries) {
      lines.push(`- **${e.type}** [${e.platformId}]: ${e.description}`);
    }
    lines.push('');
  }

  if (errors.length > 0) {
    lines.push('## ⚠️ Errors Needing Attention');
    for (const err of errors) {
      lines.push(`- ${err.platformId}: ${err.error}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`Tracking ${totalDeliveries} deliveries. ${healthyDeliveries} healthy.`);

  return { summary, markdown: lines.join('\n') };
}
