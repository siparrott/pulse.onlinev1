/**
 * Phase 7: POST /api/jobs/automation-evaluate-due
 *
 * Evaluates enabled automation rules against published deliveries.
 * For each matched delivery-rule pair: evaluates conditions, plans actions,
 * enforces constraints, and writes AutomationActionLog + Approval rows.
 *
 * Auth: X-JOB-SECRET header.
 * Trigger: external cron (every 1–6 hours).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { evaluateConditions } from '@/lib/automation/conditions';
import { planActions, enforceConstraints } from '@/lib/automation/actions';
import type {
  AutomationRule,
  RuleConditions,
  RuleActionDef,
  RuleConstraints,
  EngagementRollup,
  NormalizedMetrics,
} from '@/lib/types/database';

const MAX_CANDIDATES = 100;

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

  const supabase = createServerClient();
  const now = new Date();
  let actionsCreated = 0;
  let actionsBlocked = 0;
  let candidatesScanned = 0;
  let globalError: string | null = null;

  try {
    // ── 1. Load enabled rules for facebook ──
    const { data: rules, error: rulesErr } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_enabled', true)
      .eq('platform_id', 'facebook');

    if (rulesErr) throw new Error(`Load rules: ${rulesErr.message}`);
    if (!rules || rules.length === 0) {
      return NextResponse.json({ ok: true, message: 'No enabled rules', actionsCreated: 0 });
    }

    // ── 2. Load published facebook deliveries ──
    const { data: deliveries, error: delErr } = await supabase
      .from('post_deliveries')
      .select(`
        id, post_schedule_id, platform_id, connection_id,
        variant_storage_key, caption, link_url, status,
        platform_post_id, published_at, meta
      `)
      .eq('status', 'published')
      .eq('platform_id', 'facebook')
      .not('platform_post_id', 'is', null)
      .limit(MAX_CANDIDATES);

    if (delErr) throw new Error(`Load deliveries: ${delErr.message}`);
    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json({ ok: true, message: 'No published facebook deliveries', actionsCreated: 0 });
    }

    // ── 3. Fetch rollups for these deliveries ──
    const deliveryIds = deliveries.map((d) => d.id);
    const { data: rollups } = await supabase
      .from('engagement_rollups')
      .select('*')
      .in('post_delivery_id', deliveryIds);

    const rollupMap = new Map<string, EngagementRollup>();
    if (rollups) {
      for (const r of rollups) {
        rollupMap.set(r.post_delivery_id, r as unknown as EngagementRollup);
      }
    }

    // ── 4. Process each rule × delivery pair ──
    for (const rawRule of rules) {
      const rule = rawRule as unknown as AutomationRule;
      // Parse jsonb fields
      const conditions = (typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions) as RuleConditions;
      const actionDefs = (typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions) as RuleActionDef[];
      const constraints = (typeof rule.constraints === 'string' ? JSON.parse(rule.constraints) : rule.constraints) as RuleConstraints;

      const typedRule: AutomationRule = {
        ...rule,
        conditions,
        actions: actionDefs,
        constraints,
      };

      // ── Get today's action count for daily cap ──
      const startOfDay = new Date(now);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await supabase
        .from('automation_action_logs')
        .select('id', { count: 'exact', head: true })
        .eq('rule_id', rule.id)
        .gte('created_at', startOfDay.toISOString());

      let actionsToday = todayCount ?? 0;

      for (const delivery of deliveries) {
        candidatesScanned++;

        // ── Scope filter ──
        if (rule.scope === 'single_post' && rule.scope_ref_id) {
          if (delivery.post_schedule_id !== rule.scope_ref_id) continue;
        }
        // (tagged_posts scope not implemented yet — treat as all_posts)

        const rollup = rollupMap.get(delivery.id) ?? null;
        const publishedAt = delivery.published_at || delivery.meta?.created_at || now.toISOString();

        // ── Check if we already created actions for this rule+delivery recently ──
        const { count: existingCount } = await supabase
          .from('automation_action_logs')
          .select('id', { count: 'exact', head: true })
          .eq('rule_id', rule.id)
          .eq('post_delivery_id', delivery.id)
          .in('status', ['queued', 'approved', 'executing', 'done']);

        if ((existingCount ?? 0) > 0) continue; // Already processed

        // ── Evaluate conditions ──
        const condResult = evaluateConditions(conditions, {
          rollup,
          lastSnapshotMetrics: rollup?.totals as NormalizedMetrics ?? null,
          publishedAt: publishedAt as string,
          now,
        });

        if (!condResult.ok) continue;

        // ── Plan actions ──
        const plans = planActions(typedRule, {
          delivery: delivery as unknown as import('@/lib/types/database').PostDelivery,
          rollup,
          originalCaption: delivery.caption,
          originalScheduleId: delivery.post_schedule_id,
          variantStorageKey: delivery.variant_storage_key,
          linkUrl: delivery.link_url,
          connectionId: delivery.connection_id,
        });

        if (plans.length === 0) continue;

        // ── Fetch repost history for this delivery ──
        const { count: repostCount } = await supabase
          .from('automation_action_logs')
          .select('id', { count: 'exact', head: true })
          .eq('post_delivery_id', delivery.id)
          .in('action_type', ['schedule_repost', 'schedule_crosspost'])
          .in('status', ['queued', 'approved', 'executing', 'done']);

        const { data: lastActionRows } = await supabase
          .from('automation_action_logs')
          .select('created_at')
          .eq('rule_id', rule.id)
          .eq('post_delivery_id', delivery.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const history = {
          actionsToday,
          repostsForDelivery: repostCount ?? 0,
          lastActionForDeliveryAt: lastActionRows?.[0]?.created_at ?? null,
        };

        // ── Enforce constraints ──
        const { allowedPlans, blockedPlans } = enforceConstraints(typedRule, plans, history);

        // ── Write blocked plans ──
        for (const bp of blockedPlans) {
          await supabase.from('automation_action_logs').insert({
            user_id: rule.user_id,
            rule_id: rule.id,
            post_delivery_id: delivery.id,
            post_schedule_id: delivery.post_schedule_id,
            platform_id: delivery.platform_id,
            action_type: bp.actionType,
            status: 'blocked',
            reason: bp.blockReason,
            payload: bp.payload,
          });
          actionsBlocked++;
        }

        // ── Write allowed plans ──
        for (const ap of allowedPlans) {
          const status = typedRule.requires_approval ? 'queued' : 'queued';

          const { data: logRow } = await supabase
            .from('automation_action_logs')
            .insert({
              user_id: rule.user_id,
              rule_id: rule.id,
              post_delivery_id: delivery.id,
              post_schedule_id: delivery.post_schedule_id,
              platform_id: delivery.platform_id,
              action_type: ap.actionType,
              status,
              reason: ap.reason,
              payload: ap.payload,
            })
            .select('id')
            .single();

          // ── Create approval if required ──
          if (typedRule.requires_approval && logRow) {
            await supabase.from('automation_approvals').insert({
              action_log_id: logRow.id,
              user_id: rule.user_id,
              status: 'pending',
            });
          }

          actionsCreated++;
          actionsToday++;
        }
      }

      // ── Write automation run log ──
      await supabase.from('automation_runs').insert({
        user_id: rule.user_id,
        rule_id: rule.id,
        started_at: now.toISOString(),
        finished_at: new Date().toISOString(),
        ok: true,
        summary: { candidatesScanned, actionsCreated, actionsBlocked },
      });
    }
  } catch (err) {
    globalError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    ok: !globalError,
    candidatesScanned,
    actionsCreated,
    actionsBlocked,
    error: globalError,
  });
}
