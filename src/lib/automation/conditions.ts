/**
 * Phase 7: Automation Condition DSL
 *
 * Evaluates rule conditions against delivery/engagement data.
 * Supports:
 *   - "after_publish": time window + metric thresholds
 *   - "metric_spike": uses engagement snapshot deltas
 *   - "daily_digest_time": always true (triggers at digest time)
 */

import type {
  RuleConditions,
  MetricCondition,
  NormalizedMetrics,
  EngagementRollup,
} from '@/lib/types/database';

export interface ConditionContext {
  rollup: EngagementRollup | null;
  lastSnapshotMetrics: NormalizedMetrics | null;
  publishedAt: string;        // ISO string
  now: Date;
}

export interface ConditionResult {
  ok: boolean;
  reason: string;
}

/**
 * Evaluate a rule's conditions against a delivery context.
 */
export function evaluateConditions(
  conditions: RuleConditions,
  ctx: ConditionContext
): ConditionResult {
  const { when } = conditions;

  // ── daily_digest_time: always passes (cron triggers it at digest hour) ──
  if (when === 'daily_digest_time') {
    return { ok: true, reason: 'Triggered at daily digest time' };
  }

  // ── metric_spike: check if deltas show a spike ──
  if (when === 'metric_spike') {
    if (!ctx.rollup?.deltas_24h) {
      return { ok: false, reason: 'No delta data available for spike detection' };
    }
    // Apply metric conditions against deltas
    if (conditions.metrics?.length) {
      const result = evaluateMetricConditions(
        conditions.metrics,
        ctx.rollup.deltas_24h as NormalizedMetrics
      );
      return result;
    }
    return { ok: false, reason: 'No metric conditions defined for spike' };
  }

  // ── after_publish (primary): check time window + metric conditions ──
  if (when === 'after_publish') {
    const publishTime = new Date(ctx.publishedAt).getTime();
    const nowMs = ctx.now.getTime();
    const hoursSincePublish = (nowMs - publishTime) / (1000 * 60 * 60);

    // Check time window
    if (conditions.window) {
      const { hoursSincePublishMin, hoursSincePublishMax } = conditions.window;

      if (hoursSincePublish < hoursSincePublishMin) {
        return {
          ok: false,
          reason: `Too early: ${hoursSincePublish.toFixed(1)}h since publish, min is ${hoursSincePublishMin}h`,
        };
      }

      if (hoursSincePublish > hoursSincePublishMax) {
        return {
          ok: false,
          reason: `Too late: ${hoursSincePublish.toFixed(1)}h since publish, max is ${hoursSincePublishMax}h`,
        };
      }
    }

    // Check metric conditions against rollup totals
    if (conditions.metrics?.length) {
      if (!ctx.rollup?.totals) {
        return { ok: false, reason: 'No engagement data available yet' };
      }
      return evaluateMetricConditions(
        conditions.metrics,
        ctx.rollup.totals as NormalizedMetrics
      );
    }

    // No metric conditions — window match alone is sufficient
    return { ok: true, reason: `Within publish window (${hoursSincePublish.toFixed(1)}h)` };
  }

  return { ok: false, reason: `Unknown condition type: ${when}` };
}

/**
 * Evaluate metric conditions. Conditions are ORed (any one match triggers).
 */
function evaluateMetricConditions(
  metricConditions: MetricCondition[],
  metrics: NormalizedMetrics
): ConditionResult {
  const matchReasons: string[] = [];
  const failReasons: string[] = [];

  for (const mc of metricConditions) {
    const value = getMetricValue(metrics, mc.field);
    if (value === null || value === undefined) {
      failReasons.push(`${mc.field}: no data`);
      continue;
    }

    const passes = compareMetric(value, mc.op, mc.value);
    if (passes) {
      matchReasons.push(`${mc.field} ${mc.op} ${mc.value} (actual: ${value})`);
    } else {
      failReasons.push(`${mc.field} ${mc.op} ${mc.value} (actual: ${value})`);
    }
  }

  // OR logic: at least one condition must match
  if (matchReasons.length > 0) {
    return { ok: true, reason: `Conditions met: ${matchReasons.join('; ')}` };
  }

  return { ok: false, reason: `No conditions met: ${failReasons.join('; ')}` };
}

function getMetricValue(metrics: NormalizedMetrics, field: string): number | null {
  const m = metrics as unknown as Record<string, unknown>;
  const val = m[field];
  if (typeof val === 'number') return val;
  return null;
}

function compareMetric(actual: number, op: string, threshold: number): boolean {
  switch (op) {
    case '<':  return actual < threshold;
    case '<=': return actual <= threshold;
    case '>':  return actual > threshold;
    case '>=': return actual >= threshold;
    case '==': return actual === threshold;
    default:   return false;
  }
}
