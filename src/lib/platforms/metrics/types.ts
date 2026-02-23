/**
 * Phase 6: Metrics Fetcher Interface
 *
 * Every platform metrics adapter implements this interface.
 * Fetchers pull engagement data for a single published post
 * and return it in the normalized schema.
 */

import type { UserPlatformConnection, NormalizedMetrics } from '@/lib/types/database';

export interface MetricsFetchResult {
  ok: boolean;
  metrics: NormalizedMetrics;
  /** Minimal raw API response subset for debugging */
  raw: Record<string, unknown>;
  warnings?: string[];
  error?: string;
}

export interface MetricsFetcher {
  /** Which platform this fetcher handles */
  platformId: string;
  /** Fetch engagement metrics for a single post */
  fetch(
    connection: UserPlatformConnection,
    platformPostId: string
  ): Promise<MetricsFetchResult>;
}
