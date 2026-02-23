/**
 * Phase 5: Publisher Registry
 *
 * Central map of platformId → Publisher implementation.
 * All platform lookups go through getPublisher().
 *
 * In Phase 5, every platform uses the dry-run publisher.
 * Real publishers (LinkedIn, Meta, etc.) will be registered
 * here as they're implemented.
 */

import type { Publisher } from './types';
import { createDryRunPublisher } from './dryRun';
import { webhookPublisher } from './webhook';

// ── Registry ────────────────────────────────────────────────

const publishers = new Map<string, Publisher>();

// Register the webhook publisher
publishers.set('webhook', webhookPublisher);

// All standard platforms default to dry-run for Phase 5.
// Replace with real publishers as OAuth integrations are added.
const DRY_RUN_PLATFORMS = [
  'instagram',
  'twitter',
  'linkedin',
  'facebook',
  'tiktok',
  'youtube',
  'pinterest',
];

for (const p of DRY_RUN_PLATFORMS) {
  if (!publishers.has(p)) {
    publishers.set(p, createDryRunPublisher(p));
  }
}

// ── Public API ──────────────────────────────────────────────

/**
 * Get the publisher for a platform.
 * Falls back to a dry-run publisher if none is explicitly registered.
 */
export function getPublisher(platformId: string): Publisher {
  const pub = publishers.get(platformId);
  if (pub) return pub;

  // Auto-create a dry-run publisher for unknown platforms
  const fallback = createDryRunPublisher(platformId);
  publishers.set(platformId, fallback);
  return fallback;
}

/**
 * Check if a real (non-dry-run) publisher is registered for a platform.
 */
export function hasRealPublisher(platformId: string): boolean {
  const pub = publishers.get(platformId);
  if (!pub) return false;
  // Webhook and any future real publishers have an actual URL/SDK
  return platformId === 'webhook' || !pub.platformId.startsWith('dry-run');
}

/**
 * Register a real publisher (replaces dry-run).
 */
export function registerPublisher(publisher: Publisher): void {
  publishers.set(publisher.platformId, publisher);
}

/**
 * List all registered platform IDs.
 */
export function listRegisteredPlatforms(): string[] {
  return Array.from(publishers.keys());
}
