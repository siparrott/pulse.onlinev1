/**
 * Phase 7: POST /api/jobs/automation-execute-due
 *
 * Picks queued/approved actions and executes them:
 *   - schedule_repost: creates PostSchedule + PostDelivery (Phase 5 pipeline)
 *   - schedule_crosspost: same but to target platform
 *   - notify: creates in-app notification record
 *   - queue_comment_reply_suggestion: stores suggestion
 *
 * Auth: X-JOB-SECRET header.
 * Trigger: external cron (every 5–15 minutes).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { adjustForQuietHours } from '@/lib/automation/actions';
import type { RuleConstraints } from '@/lib/types/database';

const MAX_BATCH = 20;

// Retry backoff schedule (ms) — same as Phase 5
const RETRY_DELAYS = [
  5 * 60 * 1000,       // 5 min
  30 * 60 * 1000,      // 30 min
  2 * 60 * 60 * 1000,  // 2h
  12 * 60 * 60 * 1000, // 12h
];
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  // ── Auth ──
  const secret = process.env.JOB_SECRET;
  const headerSecret = request.headers.get('x-job-secret');
  if (!secret || headerSecret !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  // ── Global kill switch ──
  if (process.env.AUTOMATION_DISABLED === 'true') {
    return NextResponse.json({
      ok: true,
      message: 'AUTOMATION_DISABLED — execution blocked globally',
      executed: 0,
    });
  }

  const supabase = createServerClient();
  const now = new Date();
  let executed = 0;
  let failed = 0;
  let skipped = 0;
  let globalError: string | null = null;

  try {
    // ── 1. Pick queued action logs due for execution ──
    const { data: actionLogs, error: fetchErr } = await supabase
      .from('automation_action_logs')
      .select('*')
      .eq('status', 'queued')
      .or(`next_retry_at.is.null,next_retry_at.lte.${now.toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(MAX_BATCH);

    if (fetchErr) throw new Error(`Fetch action logs: ${fetchErr.message}`);
    if (!actionLogs || actionLogs.length === 0) {
      return NextResponse.json({ ok: true, message: 'No queued actions', executed: 0 });
    }

    for (const log of actionLogs) {
      try {
        // ── 2. Check if rule requires approval ──
        const { data: rule } = await supabase
          .from('automation_rules')
          .select('requires_approval, constraints, is_enabled')
          .eq('id', log.rule_id)
          .single();

        if (!rule) {
          await markSkipped(supabase, log.id, 'Rule not found');
          skipped++;
          continue;
        }

        if (!rule.is_enabled) {
          await markSkipped(supabase, log.id, 'Rule disabled');
          skipped++;
          continue;
        }

        // ── 3. If requires approval, check approval status ──
        if (rule.requires_approval) {
          const { data: approval } = await supabase
            .from('automation_approvals')
            .select('status')
            .eq('action_log_id', log.id)
            .single();

          if (!approval || approval.status === 'pending') {
            await markSkipped(supabase, log.id, 'Awaiting approval');
            skipped++;
            continue;
          }

          if (approval.status === 'rejected') {
            await markSkipped(supabase, log.id, 'Approval rejected');
            skipped++;
            continue;
          }

          // approved — continue to execution
        }

        // ── 4. Mark as executing ──
        await supabase
          .from('automation_action_logs')
          .update({ status: 'executing', attempts: log.attempts + 1 })
          .eq('id', log.id);

        // ── 5. Execute action by type ──
        const payload = log.payload as Record<string, unknown>;
        const constraints = (typeof rule.constraints === 'string'
          ? JSON.parse(rule.constraints)
          : rule.constraints) as RuleConstraints;

        let externalId: string | null = null;

        switch (log.action_type) {
          case 'schedule_repost':
            externalId = await executeScheduleRepost(supabase, log, payload, constraints, now);
            break;

          case 'schedule_crosspost':
            externalId = await executeScheduleCrosspost(supabase, log, payload, constraints, now);
            break;

          case 'notify':
            await executeNotify(supabase, log, payload);
            break;

          case 'queue_comment_reply_suggestion':
            await executeCommentSuggestion(supabase, log, payload);
            break;

          default:
            await markFailed(supabase, log, `Unknown action type: ${log.action_type}`);
            failed++;
            continue;
        }

        // ── 6. Mark as done ──
        await supabase
          .from('automation_action_logs')
          .update({
            status: 'done',
            external_action_id: externalId,
          })
          .eq('id', log.id);

        executed++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await markFailed(supabase, log, errMsg);
        failed++;
      }
    }
  } catch (err) {
    globalError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: !globalError,
    executed,
    failed,
    skipped,
    error: globalError,
  });
}

// ── Execution helpers ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeScheduleRepost(supabase: any, log: any, payload: Record<string, unknown>, constraints: RuleConstraints, now: Date): Promise<string | null> {
  const delayHours = (payload.delayHours as number) ?? 24;
  const captionAppend = (payload.captionAppend as string) ?? '';
  const originalCaption = (payload.originalCaption as string) ?? '';
  const variantStorageKey = (payload.variantStorageKey as string) ?? null;
  const linkUrl = (payload.linkUrl as string) ?? null;
  const connectionId = (payload.connectionId as string) ?? log.connection_id;

  // Calculate schedule time, adjusted for quiet hours
  let scheduledFor = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  scheduledFor = adjustForQuietHours(scheduledFor, constraints.quietHours);

  // Build caption
  const caption = captionAppend
    ? `${originalCaption}\n\n${captionAppend}`
    : originalCaption;

  // Get the original schedule's post_id
  const { data: origSchedule } = await supabase
    .from('post_schedules')
    .select('post_id, timezone')
    .eq('id', log.post_schedule_id)
    .single();

  if (!origSchedule) throw new Error('Original schedule not found');

  // Create new PostSchedule
  const { data: newSchedule, error: schedErr } = await supabase
    .from('post_schedules')
    .insert({
      user_id: log.user_id,
      post_id: origSchedule.post_id,
      timezone: origSchedule.timezone || 'UTC',
      scheduled_for: scheduledFor.toISOString(),
      status: 'scheduled',
      meta: { automation_rule_id: log.rule_id, automation_action_log_id: log.id, repost_of_delivery: log.post_delivery_id },
    })
    .select('id')
    .single();

  if (schedErr) throw new Error(`Create schedule: ${schedErr.message}`);

  // Resolve connectionId — use from payload or find facebook connection
  let resolvedConnectionId = connectionId;
  if (!resolvedConnectionId) {
    const { data: conn } = await supabase
      .from('user_platform_connections')
      .select('id')
      .eq('user_id', log.user_id)
      .eq('platform_id', 'facebook')
      .eq('status', 'connected')
      .limit(1)
      .single();
    resolvedConnectionId = conn?.id;
  }
  if (!resolvedConnectionId) throw new Error('No facebook connection found');

  // Create PostDelivery
  const { error: delErr } = await supabase
    .from('post_deliveries')
    .insert({
      post_schedule_id: newSchedule.id,
      platform_id: 'facebook',
      connection_id: resolvedConnectionId,
      variant_storage_key: variantStorageKey,
      caption,
      link_url: linkUrl,
      status: 'queued',
      meta: { automation_repost: true, original_delivery_id: log.post_delivery_id },
    });

  if (delErr) throw new Error(`Create delivery: ${delErr.message}`);

  return newSchedule.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeScheduleCrosspost(supabase: any, log: any, payload: Record<string, unknown>, constraints: RuleConstraints, now: Date): Promise<string | null> {
  const target = (payload.target as string) ?? 'instagram';
  const delayHours = (payload.delayHours as number) ?? 24;
  const originalCaption = (payload.originalCaption as string) ?? '';
  const variantStorageKey = (payload.variantStorageKey as string) ?? null;
  const linkUrl = (payload.linkUrl as string) ?? null;

  // Find a connection for the target platform
  const { data: targetConn } = await supabase
    .from('user_platform_connections')
    .select('id')
    .eq('user_id', log.user_id)
    .eq('platform_id', target)
    .eq('status', 'connected')
    .limit(1)
    .single();

  if (!targetConn) throw new Error(`No ${target} connection found for crosspost`);

  let scheduledFor = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
  scheduledFor = adjustForQuietHours(scheduledFor, constraints.quietHours);

  const { data: origSchedule } = await supabase
    .from('post_schedules')
    .select('post_id, timezone')
    .eq('id', log.post_schedule_id)
    .single();

  if (!origSchedule) throw new Error('Original schedule not found');

  const { data: newSchedule, error: schedErr } = await supabase
    .from('post_schedules')
    .insert({
      user_id: log.user_id,
      post_id: origSchedule.post_id,
      timezone: origSchedule.timezone || 'UTC',
      scheduled_for: scheduledFor.toISOString(),
      status: 'scheduled',
      meta: { automation_rule_id: log.rule_id, crosspost_to: target, original_delivery_id: log.post_delivery_id },
    })
    .select('id')
    .single();

  if (schedErr) throw new Error(`Create crosspost schedule: ${schedErr.message}`);

  const { error: delErr } = await supabase
    .from('post_deliveries')
    .insert({
      post_schedule_id: newSchedule.id,
      platform_id: target,
      connection_id: targetConn.id,
      variant_storage_key: variantStorageKey,
      caption: originalCaption,
      link_url: linkUrl,
      status: 'queued',
      meta: { automation_crosspost: true, original_delivery_id: log.post_delivery_id },
    });

  if (delErr) throw new Error(`Create crosspost delivery: ${delErr.message}`);

  return newSchedule.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeNotify(supabase: any, log: any, payload: Record<string, unknown>): Promise<void> {
  const message = (payload.message as string) ?? 'Automation notification';

  // Store as a user engagement event of type 'automation_notify'
  // (reusing the events table for in-app notifications)
  await supabase.from('user_engagement_events').insert({
    user_id: log.user_id,
    type: 'milestone', // reuse milestone type for notifications
    post_delivery_id: log.post_delivery_id,
    platform_id: log.platform_id,
    occurred_at: new Date().toISOString(),
    payload: {
      automation: true,
      rule_id: log.rule_id,
      action_log_id: log.id,
      message,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeCommentSuggestion(supabase: any, log: any, payload: Record<string, unknown>): Promise<void> {
  const tone = (payload.tone as string) ?? 'friendly';
  const maxSuggestions = (payload.maxSuggestions as number) ?? 3;

  // Store as a queued event (no external API call — suggestion only)
  await supabase.from('user_engagement_events').insert({
    user_id: log.user_id,
    type: 'comment',
    post_delivery_id: log.post_delivery_id,
    platform_id: log.platform_id,
    occurred_at: new Date().toISOString(),
    payload: {
      automation: true,
      rule_id: log.rule_id,
      action_log_id: log.id,
      suggestion: true,
      tone,
      maxSuggestions,
      message: `Reply suggestion queued (tone: ${tone}, max: ${maxSuggestions})`,
    },
  });
}

// ── Status update helpers ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markSkipped(supabase: any, logId: string, reason: string) {
  // Don't permanently mark as skipped for pending approvals — reset to queued
  if (reason === 'Awaiting approval') {
    // Leave as queued so it's picked up again after approval
    return;
  }
  await supabase
    .from('automation_action_logs')
    .update({ status: 'skipped', reason })
    .eq('id', logId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function markFailed(supabase: any, log: any, error: string) {
  const attempts = (log.attempts ?? 0) + 1;

  if (attempts < MAX_ATTEMPTS) {
    const delayMs = RETRY_DELAYS[Math.min(attempts - 1, RETRY_DELAYS.length - 1)];
    const retryAt = new Date(Date.now() + delayMs).toISOString();
    await supabase
      .from('automation_action_logs')
      .update({
        status: 'queued',
        attempts,
        next_retry_at: retryAt,
        reason: `Attempt ${attempts} failed: ${error}`,
      })
      .eq('id', log.id);
  } else {
    await supabase
      .from('automation_action_logs')
      .update({
        status: 'failed',
        attempts,
        reason: `Max attempts (${MAX_ATTEMPTS}) reached: ${error}`,
      })
      .eq('id', log.id);
  }
}
