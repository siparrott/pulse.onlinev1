/**
 * Phase 6: POST /api/jobs/ingest-engagement-due
 *
 * The engagement ingestion runner. Finds published deliveries that are
 * due for metrics capture, fetches metrics via the platform adapter,
 * stores EngagementSnapshot + updates EngagementRollup, and detects events.
 *
 * Due logic:
 *   - First 48h after publish: ingest every 2 hours
 *   - After 48h: ingest daily
 *
 * Authentication: requires X-JOB-SECRET header matching JOB_SECRET env var.
 * Trigger: external cron (every 1–6 hours) + due logic throttles per post.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getMetricsFetcher } from '@/lib/platforms/metrics';
import { computeEngagementRate, deltaSincePrevious, detectMilestones, detectSpike } from '@/lib/metrics/compute';
import type { UserPlatformConnection, NormalizedMetrics } from '@/lib/types/database';

const MAX_BATCH = 50;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────
  const secret = process.env.JOB_SECRET;
  const headerSecret = request.headers.get('x-job-secret');

  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const supabase = createServerClient();
  const runStarted = new Date().toISOString();
  const now = Date.now();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let globalError: string | null = null;

  try {
    // ── 1. Find published deliveries with platform_post_id ──
    const { data: deliveries, error: fetchErr } = await supabase
      .from('post_deliveries')
      .select(`
        id, platform_id, connection_id, platform_post_id,
        published_at, meta
      `)
      .eq('status', 'published')
      .not('platform_post_id', 'is', null)
      .limit(MAX_BATCH * 2); // over-fetch to account for not-due ones

    if (fetchErr) throw new Error(`Fetch deliveries failed: ${fetchErr.message}`);
    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No published deliveries' });
    }

    // ── 2. Check which are due for ingestion ────────────────
    // Fetch last snapshot time per delivery in one query
    const deliveryIds = deliveries.map((d) => d.id);
    const { data: rollups } = await supabase
      .from('engagement_rollups')
      .select('post_delivery_id, last_captured_at')
      .in('post_delivery_id', deliveryIds);

    const lastCapturedMap = new Map<string, string>();
    if (rollups) {
      for (const r of rollups) {
        lastCapturedMap.set(r.post_delivery_id, r.last_captured_at);
      }
    }

    const dueDeliveries = deliveries.filter((d) => {
      const publishedAt = d.published_at ? new Date(d.published_at).getTime() : 0;
      const lastCaptured = lastCapturedMap.get(d.id);
      const lastCapturedMs = lastCaptured ? new Date(lastCaptured).getTime() : 0;

      const hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);
      const isFirstWindow = hoursSincePublish <= 48;
      const interval = isFirstWindow ? TWO_HOURS_MS : TWENTY_FOUR_HOURS_MS;

      // Due if never captured or enough time has passed since last capture
      if (!lastCaptured) return true;
      return (now - lastCapturedMs) >= interval;
    });

    if (dueDeliveries.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No deliveries due for ingestion' });
    }

    // Limit to batch size
    const batch = dueDeliveries.slice(0, MAX_BATCH);

    // ── 3. Pre-fetch connections for the batch ──────────────
    const connectionIds = [...new Set(batch.map((d) => d.connection_id))];
    const { data: connections } = await supabase
      .from('user_platform_connections')
      .select('*')
      .in('id', connectionIds);

    const connectionMap = new Map<string, UserPlatformConnection>();
    if (connections) {
      for (const c of connections) {
        connectionMap.set(c.id, c as UserPlatformConnection);
      }
    }

    // ── 4. Process each delivery ────────────────────────────
    for (const delivery of batch) {
      processed++;

      const connection = connectionMap.get(delivery.connection_id);
      if (!connection) {
        skipped++;
        continue;
      }

      const fetcher = getMetricsFetcher(delivery.platform_id);
      if (!fetcher) {
        skipped++;
        continue;
      }

      try {
        // Fetch metrics from platform adapter
        const result = await fetcher.fetch(connection, delivery.platform_post_id!);

        // Compute engagement rate
        const metrics: NormalizedMetrics = {
          ...result.metrics,
          engagementRate: computeEngagementRate(result.metrics),
        };

        const capturedAt = new Date().toISOString();

        // Store snapshot
        await supabase.from('engagement_snapshots').insert({
          user_id: 'default',
          platform_id: delivery.platform_id,
          connection_id: delivery.connection_id,
          post_delivery_id: delivery.id,
          platform_post_id: delivery.platform_post_id,
          captured_at: capturedAt,
          metrics,
          raw: result.raw,
          ok: result.ok,
          error: result.error || null,
        });

        if (!result.ok) {
          // Store error event
          await supabase.from('user_engagement_events').insert({
            user_id: 'default',
            type: 'error',
            post_delivery_id: delivery.id,
            platform_id: delivery.platform_id,
            payload: { error: result.error, warnings: result.warnings },
          });
          failed++;
          continue;
        }

        // ── Update/create rollup ──────────────────────────
        // Fetch previous rollup for deltas
        const { data: existingRollup } = await supabase
          .from('engagement_rollups')
          .select('*')
          .eq('post_delivery_id', delivery.id)
          .single();

        const previousMetrics = existingRollup?.totals as NormalizedMetrics | null;
        const deltas = previousMetrics
          ? deltaSincePrevious(metrics, previousMetrics)
          : {};

        if (existingRollup) {
          await supabase
            .from('engagement_rollups')
            .update({
              totals: metrics,
              deltas_24h: deltas,
              last_captured_at: capturedAt,
            })
            .eq('id', existingRollup.id);
        } else {
          await supabase.from('engagement_rollups').insert({
            user_id: 'default',
            post_delivery_id: delivery.id,
            platform_id: delivery.platform_id,
            totals: metrics,
            deltas_24h: deltas,
            last_captured_at: capturedAt,
          });
        }

        // ── Detect events ─────────────────────────────────
        if (previousMetrics) {
          // Spike detection
          const spike = detectSpike(metrics, previousMetrics);
          if (spike) {
            await supabase.from('user_engagement_events').insert({
              user_id: 'default',
              type: 'spike',
              post_delivery_id: delivery.id,
              platform_id: delivery.platform_id,
              payload: spike,
            });
          }

          // Milestone detection
          const milestones = detectMilestones(metrics, previousMetrics);
          for (const m of milestones) {
            await supabase.from('user_engagement_events').insert({
              user_id: 'default',
              type: 'milestone',
              post_delivery_id: delivery.id,
              platform_id: delivery.platform_id,
              payload: m,
            });
          }
        }

        succeeded++;
      } catch (err) {
        // Store error snapshot but don't block others
        const errMsg = err instanceof Error ? err.message : String(err);

        await supabase.from('engagement_snapshots').insert({
          user_id: 'default',
          platform_id: delivery.platform_id,
          connection_id: delivery.connection_id,
          post_delivery_id: delivery.id,
          platform_post_id: delivery.platform_post_id || '',
          captured_at: new Date().toISOString(),
          metrics: {},
          raw: {},
          ok: false,
          error: errMsg,
        });

        failed++;
      }
    }
  } catch (err) {
    globalError = err instanceof Error ? err.message : String(err);
  }

  // ── Log the run ──────────────────────────────────────────
  try {
    await supabase.from('job_run_logs').insert({
      type: 'ingest-engagement',
      started_at: runStarted,
      finished_at: new Date().toISOString(),
      ok: !globalError,
      summary: { processed, succeeded, failed, skipped },
      error: globalError,
    });
  } catch { /* best-effort logging */ }

  return NextResponse.json({
    ok: !globalError,
    processed,
    succeeded,
    failed,
    skipped,
    error: globalError,
  });
}
