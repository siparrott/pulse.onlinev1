/**
 * Phase 5: Dry-Run Publisher
 *
 * Simulates a publish for any platform. Sleeps 300–800ms,
 * then returns a fake platformPostId. Marks delivery as
 * published with raw.meta.dryRun = true so it's clearly
 * distinguishable from real publishes.
 */

import type { UserPlatformConnection } from '@/lib/types/database';
import type { Publisher, PublishPayload, PublishResult, ValidateResult } from './types';

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createDryRunPublisher(platformId: string): Publisher {
  return {
    platformId,
    supports: {
      immediate: true,
      scheduled: false,
      media: 'image',
    },

    async validate(
      _connection: UserPlatformConnection,
      payload: PublishPayload
    ): Promise<ValidateResult> {
      const warnings: string[] = [];
      if (!payload.caption || payload.caption.trim().length === 0) {
        warnings.push('Caption is empty');
      }
      return { ok: true, warnings };
    },

    async publish(
      connection: UserPlatformConnection,
      payload: PublishPayload
    ): Promise<PublishResult> {
      await randomDelay(300, 800);

      const fakePostId = `dry-run-${platformId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      return {
        ok: true,
        platformPostId: fakePostId,
        publishedAt: new Date().toISOString(),
        raw: {
          dryRun: true,
          platformId,
          connectionId: connection.id,
          accountLabel: connection.account_label,
          captionLength: payload.caption.length,
          hasImage: !!payload.imageBuffer,
          imageBytes: payload.imageBuffer?.byteLength ?? 0,
        },
      };
    },
  };
}
