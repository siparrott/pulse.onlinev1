/**
 * Phase 6: Metrics Fetcher Registry
 *
 * All 7 platforms default to dry-run fetchers.
 * Replace with real fetchers as APIs are integrated.
 */

import { createDryRunMetricsFetcher } from './dryRun';
import type { MetricsFetcher } from './types';

const registry = new Map<string, MetricsFetcher>();

// Register dry-run fetchers for all platforms
const ALL_PLATFORMS = ['instagram', 'twitter', 'linkedin', 'facebook', 'tiktok', 'youtube', 'pinterest'];

for (const p of ALL_PLATFORMS) {
  registry.set(p, createDryRunMetricsFetcher(p));
}

export function getMetricsFetcher(platformId: string): MetricsFetcher | undefined {
  return registry.get(platformId);
}

export function registerMetricsFetcher(fetcher: MetricsFetcher): void {
  registry.set(fetcher.platformId, fetcher);
}

export function hasRealMetricsFetcher(platformId: string): boolean {
  const f = registry.get(platformId);
  // dry-run fetchers always mark raw.meta.dryRun = true; real ones don't
  return !!f && !f.platformId.startsWith('dry-run-');
}

export function listRegisteredFetchers(): string[] {
  return Array.from(registry.keys());
}
