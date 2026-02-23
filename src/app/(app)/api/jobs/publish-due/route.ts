/**
 * Phase 5: POST /api/jobs/publish-due
 *
 * The publishing job runner. Finds due PostSchedules, claims them,
 * attempts delivery for each platform, tracks retries with backoff,
 * and logs all runs.
 *
 * Authentication: requires X-JOB-SECRET header matching JOB_SECRET env var.
 * Trigger: external cron (every 1–5 min) or admin "Run now" button.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getPublisher } from '@/lib/platforms/publishers';
import { decryptAccessToken, rotateTokensIfNeeded } from '@/lib/platforms/tokens';
import type { UserPlatformConnection, PostDelivery } from '@/lib/types/database';
import type { PublishPayload } from '@/lib/platforms/publishers/types';

const MAX_BATCH = 20;
const MAX_ATTEMPTS = 5;

// Backoff schedule (in ms) per attempt number
const BACKOFF_MS: Record<number, number> = {
  1: 5 * 60 * 1000,       // 5 min
  2: 30 * 60 * 1000,      // 30 min
  3: 2 * 60 * 60 * 1000,  // 2 hours
  4: 12 * 60 * 60 * 1000, // 12 hours
};

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
  const results: { scheduleId: string; status: string; deliveries: number; published: number; failed: number }[] = [];
  let globalError: string | null = null;

  try {
    // ── 1. Claim due schedules ────────────────────────────
    // Atomic claim: update status from "scheduled" to "publishing"
    // where scheduledFor <= now, returning the claimed rows.
    const now = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from('post_schedules')
      .update({ status: 'publishing' })
      .eq('status', 'scheduled')
      .lte('scheduled_for', now)
      .select('*')
      .limit(MAX_BATCH);

    if (claimErr) {
      throw new Error(`Claim failed: ${claimErr.message}`);
    }

    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, message: 'No due schedules' });
    }

    // ── 2. Process each schedule ──────────────────────────
    for (const schedule of claimed) {
      const scheduleResult = { scheduleId: schedule.id, status: 'unknown', deliveries: 0, published: 0, failed: 0 };

      try {
        // Fetch deliveries for this schedule
        const { data: deliveries, error: delErr } = await supabase
          .from('post_deliveries')
          .select('*')
          .eq('post_schedule_id', schedule.id)
          .in('status', ['queued', 'failed']);

        if (delErr) throw new Error(`Fetch deliveries failed: ${delErr.message}`);
        if (!deliveries || deliveries.length === 0) {
          // No deliveries to process; mark as published
          await supabase.from('post_schedules').update({ status: 'published' }).eq('id', schedule.id);
          scheduleResult.status = 'published';
          results.push(scheduleResult);
          continue;
        }

        // Filter failed deliveries: only retry if nextRetryAt <= now and attempts < max
        const eligible = deliveries.filter((d: PostDelivery) => {
          if (d.status === 'queued') return true;
          if (d.status === 'failed') {
            if (d.attempts >= MAX_ATTEMPTS) return false;
            if (d.next_retry_at && new Date(d.next_retry_at) > new Date()) return false;
            return true;
          }
          return false;
        });

        scheduleResult.deliveries = eligible.length;

        // ── 3. Process each delivery ────────────────────────
        for (const delivery of eligible) {
          try {
            // Mark as publishing
            await supabase
              .from('post_deliveries')
              .update({ status: 'publishing', attempts: delivery.attempts + 1 })
              .eq('id', delivery.id);

            // Fetch connection
            const { data: connRow, error: connErr } = await supabase
              .from('user_platform_connections')
              .select('*')
              .eq('id', delivery.connection_id)
              .single();

            if (connErr || !connRow) {
              throw new Error(`Connection ${delivery.connection_id} not found`);
            }

            const connection = connRow as UserPlatformConnection;

            // Check token freshness
            await rotateTokensIfNeeded(connection);
            if (connection.status === 'expired' || connection.status === 'revoked') {
              throw new Error(`Connection ${connection.id} (${connection.platform_id}) is ${connection.status}`);
            }

            // Get publisher
            const publisher = getPublisher(delivery.platform_id);

            // Build payload
            const payload: PublishPayload = {
              caption: delivery.caption,
              linkUrl: delivery.link_url ?? undefined,
              meta: {
                ...(delivery.meta as Record<string, unknown> || {}),
                scheduleId: schedule.id,
                deliveryId: delivery.id,
              },
            };

            // Optionally download variant image
            if (delivery.variant_storage_key) {
              const { data: imgFile, error: dlErr } = await supabase.storage
                .from('publisher-assets')
                .download(delivery.variant_storage_key);

              if (!dlErr && imgFile) {
                payload.imageBuffer = Buffer.from(await imgFile.arrayBuffer());
                payload.imageMimeType = 'image/jpeg';
                payload.imageFilename = delivery.variant_storage_key.split('/').pop() ?? 'variant.jpg';
              }
            }

            // Validate
            const validation = await publisher.validate(connection, payload);
            if (!validation.ok) {
              throw new Error(`Validation failed: ${validation.warnings.join(', ')}`);
            }

            // Publish
            const result = await publisher.publish(connection, payload);

            if (result.ok) {
              await supabase
                .from('post_deliveries')
                .update({
                  status: 'published',
                  platform_post_id: result.platformPostId ?? null,
                  published_at: result.publishedAt ?? new Date().toISOString(),
                  last_error: null,
                  next_retry_at: null,
                  meta: { ...(delivery.meta as Record<string, unknown> || {}), raw: result.raw },
                })
                .eq('id', delivery.id);

              scheduleResult.published++;
            } else {
              throw new Error(
                result.raw?.error
                  ? String(result.raw.error)
                  : 'Publish returned ok=false'
              );
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            const attempt = delivery.attempts + 1;
            const backoffMs = BACKOFF_MS[attempt] ?? 24 * 60 * 60 * 1000;
            const nextRetry = attempt >= MAX_ATTEMPTS
              ? null
              : new Date(Date.now() + backoffMs).toISOString();

            await supabase
              .from('post_deliveries')
              .update({
                status: attempt >= MAX_ATTEMPTS ? 'failed' : 'failed',
                last_error: errorMsg,
                next_retry_at: nextRetry,
              })
              .eq('id', delivery.id);

            scheduleResult.failed++;
          }
        }

        // ── 4. Finalize schedule status ─────────────────────
        // Re-fetch all deliveries to get final counts
        const { data: allDeliveries } = await supabase
          .from('post_deliveries')
          .select('status')
          .eq('post_schedule_id', schedule.id);

        const statuses = (allDeliveries ?? []).map((d: { status: string }) => d.status);
        const allPublished = statuses.every((s: string) => s === 'published' || s === 'skipped');
        const somePublished = statuses.some((s: string) => s === 'published');
        const allFinalFailed = statuses.every((s: string) => s === 'failed' && 
          (deliveries.find((d: PostDelivery) => d.status === 'failed')?.attempts ?? 0) >= MAX_ATTEMPTS
        );

        let finalStatus: string;
        if (allPublished) {
          finalStatus = 'published';
        } else if (allFinalFailed) {
          finalStatus = 'failed';
        } else if (somePublished) {
          finalStatus = 'partially_published';
        } else {
          // Some still retrying
          finalStatus = 'scheduled';
        }

        await supabase.from('post_schedules').update({ status: finalStatus }).eq('id', schedule.id);
        scheduleResult.status = finalStatus;

        // Also update the publisher_posts status
        if (finalStatus === 'published') {
          await supabase.from('publisher_posts').update({ status: 'published' }).eq('id', schedule.post_id);
        } else if (finalStatus === 'failed') {
          await supabase.from('publisher_posts').update({ status: 'failed' }).eq('id', schedule.post_id);
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        scheduleResult.status = 'error';
        // Revert schedule to scheduled so it can be retried
        await supabase.from('post_schedules').update({ status: 'scheduled' }).eq('id', schedule.id);
        console.error(`[publish-due] Schedule ${schedule.id} error:`, errMsg);
      }

      results.push(scheduleResult);
    }
  } catch (err) {
    globalError = err instanceof Error ? err.message : String(err);
    console.error('[publish-due] Global error:', globalError);
  }

  // ── 5. Log the run ──────────────────────────────────────
  try {
    await supabase.from('job_run_logs').insert({
      type: 'publish',
      started_at: runStarted,
      finished_at: new Date().toISOString(),
      ok: !globalError,
      summary: { results },
      error: globalError,
    });
  } catch (logErr) {
    console.error('[publish-due] Failed to log run:', logErr);
  }

  return NextResponse.json({
    ok: !globalError,
    processed: results.length,
    results,
    error: globalError,
  });
}
