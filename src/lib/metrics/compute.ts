/**
 * Phase 6: Computed Engagement Metrics
 *
 * - computeEngagementRate: calculates ER% from normalized metrics
 * - deltaSincePrevious: field-by-field deltas between two snapshots
 */

import type { NormalizedMetrics } from '@/lib/types/database';

/**
 * Compute engagement rate from normalized metrics.
 * Formula: (likes + comments + shares + saves) / denominator
 * Denominator preference: impressions > reach > views
 * Returns null if no suitable denominator.
 */
export function computeEngagementRate(metrics: NormalizedMetrics): number | null {
  const numerator =
    (metrics.likes ?? 0) +
    (metrics.comments ?? 0) +
    (metrics.shares ?? 0) +
    (metrics.saves ?? 0);

  if (numerator === 0) return 0;

  const denominator = metrics.impressions ?? metrics.reach ?? metrics.views;
  if (!denominator || denominator === 0) return null;

  return Math.round((numerator / denominator) * 10000) / 100; // two decimal places
}

/**
 * Compute field-by-field deltas between current and previous metrics.
 * For each numeric field: delta = current - previous (null if either is null).
 */
export function deltaSincePrevious(
  current: NormalizedMetrics,
  previous: NormalizedMetrics
): Partial<NormalizedMetrics> {
  const fields: (keyof NormalizedMetrics)[] = [
    'likes', 'comments', 'shares', 'saves',
    'views', 'impressions', 'reach', 'clicks',
    'profileVisits', 'follows',
  ];

  const deltas: Partial<NormalizedMetrics> = {};

  for (const f of fields) {
    const cur = current[f] as number | null;
    const prev = previous[f] as number | null;
    if (cur != null && prev != null) {
      (deltas as Record<string, unknown>)[f] = cur - prev;
    }
  }

  return deltas;
}

/**
 * Detect milestone achievements (likes >= 100/500/1000, etc.)
 */
export function detectMilestones(
  current: NormalizedMetrics,
  previous: NormalizedMetrics | null
): Array<{ field: string; threshold: number }> {
  const thresholds: Record<string, number[]> = {
    likes: [100, 500, 1000, 5000, 10000],
    views: [1000, 5000, 10000, 50000, 100000],
    shares: [50, 100, 500, 1000],
    comments: [50, 100, 500],
  };

  const milestones: Array<{ field: string; threshold: number }> = [];

  for (const [field, levels] of Object.entries(thresholds)) {
    const cur = (current as unknown as Record<string, unknown>)[field] as number | null;
    const prev = previous
      ? ((previous as unknown as Record<string, unknown>)[field] as number | null)
      : 0;

    if (cur == null) continue;

    for (const level of levels) {
      if (cur >= level && (prev == null || prev < level)) {
        milestones.push({ field, threshold: level });
      }
    }
  }

  return milestones;
}

/**
 * Detect view/engagement spike: delta > X% over previous.
 */
export function detectSpike(
  current: NormalizedMetrics,
  previous: NormalizedMetrics,
  thresholdPct: number = 50
): { field: string; deltaPct: number } | null {
  const checkFields = ['views', 'impressions', 'likes'] as const;

  for (const field of checkFields) {
    const cur = current[field];
    const prev = previous[field];
    if (cur == null || prev == null || prev === 0) continue;

    const deltaPct = ((cur - prev) / prev) * 100;
    if (deltaPct >= thresholdPct) {
      return { field, deltaPct: Math.round(deltaPct * 10) / 10 };
    }
  }

  return null;
}
