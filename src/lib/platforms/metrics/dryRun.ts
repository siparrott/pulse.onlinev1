/**
 * Phase 6: Dry-Run Metrics Fetcher
 *
 * Returns plausible increasing metrics over time using a deterministic seed.
 * Seed = simple hash of (postDeliveryId + dayNumber) so repeated calls at
 * the same time return the same numbers, but numbers grow day-over-day.
 *
 * Marks raw.meta.dryRun = true so it is clearly distinguishable.
 */

import type { UserPlatformConnection, NormalizedMetrics } from '@/lib/types/database';
import type { MetricsFetcher, MetricsFetchResult } from './types';

/**
 * Simple deterministic hash to number (0–1 range).
 */
function seedRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10000) / 10000;
}

/**
 * Day number since epoch (for growth curves).
 */
function dayNumber(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60 * 24));
}

export function createDryRunMetricsFetcher(platformId: string): MetricsFetcher {
  return {
    platformId,

    async fetch(
      _connection: UserPlatformConnection,
      platformPostId: string
    ): Promise<MetricsFetchResult> {
      // Deterministic seed
      const day = dayNumber();
      const s = seedRandom(`${platformPostId}-${day}`);

      // Base metrics that grow with day number (since deliveryId fixed)
      const baseLikes = Math.floor(20 + s * 80 + day % 30 * 5);
      const baseComments = Math.floor(2 + s * 15 + day % 30);
      const baseShares = Math.floor(1 + s * 10 + day % 30 * 0.5);
      const baseViews = Math.floor(200 + s * 800 + day % 30 * 50);
      const baseImpressions = Math.floor(baseViews * (1.2 + s * 0.5));
      const baseReach = Math.floor(baseImpressions * (0.6 + s * 0.3));
      const baseClicks = Math.floor(5 + s * 30 + day % 30 * 2);
      const baseSaves = Math.floor(1 + s * 8);

      const metrics: NormalizedMetrics = {
        likes: baseLikes,
        comments: baseComments,
        shares: baseShares,
        saves: baseSaves,
        views: baseViews,
        impressions: baseImpressions,
        reach: baseReach,
        clicks: baseClicks,
        profileVisits: Math.floor(s * 10),
        follows: Math.floor(s * 3),
        engagementRate: null, // computed later
        currency: null,
        notes: `Dry-run simulated metrics for ${platformId}`,
      };

      return {
        ok: true,
        metrics,
        raw: {
          meta: { dryRun: true },
          platformId,
          platformPostId,
          dayNumber: day,
          seed: s.toFixed(4),
        },
      };
    },
  };
}
