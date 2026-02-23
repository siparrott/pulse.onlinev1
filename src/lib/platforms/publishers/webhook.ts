/**
 * Phase 5: Webhook Publisher
 *
 * Posts to a configurable webhook URL (YOUR own endpoint) for
 * end-to-end pipeline testing. Sends a JSON payload with the
 * caption, platform, connection info, and image as base64.
 *
 * Configured via WEBHOOK_PUBLISHER_URL env var.
 */

import type { UserPlatformConnection } from '@/lib/types/database';
import type { Publisher, PublishPayload, PublishResult, ValidateResult } from './types';

const WEBHOOK_URL = process.env.WEBHOOK_PUBLISHER_URL;

export const webhookPublisher: Publisher = {
  platformId: 'webhook',
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
    if (!WEBHOOK_URL) {
      return { ok: false, warnings: ['WEBHOOK_PUBLISHER_URL env var is not set'] };
    }
    if (!payload.caption?.trim()) {
      warnings.push('Caption is empty');
    }
    return { ok: true, warnings };
  },

  async publish(
    connection: UserPlatformConnection,
    payload: PublishPayload
  ): Promise<PublishResult> {
    const url = WEBHOOK_URL;
    if (!url) {
      return { ok: false, raw: { error: 'WEBHOOK_PUBLISHER_URL not configured' } };
    }

    const body = {
      platformId: 'webhook',
      connectionId: connection.id,
      accountLabel: connection.account_label,
      caption: payload.caption,
      linkUrl: payload.linkUrl,
      hasImage: !!payload.imageBuffer,
      imageBase64: payload.imageBuffer ? payload.imageBuffer.toString('base64') : null,
      imageMimeType: payload.imageMimeType,
      imageFilename: payload.imageFilename,
      meta: payload.meta,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseText = await res.text();
      let responseJson: Record<string, unknown> = {};
      try { responseJson = JSON.parse(responseText); } catch { /* text only */ }

      if (!res.ok) {
        return {
          ok: false,
          raw: { status: res.status, body: responseText },
        };
      }

      return {
        ok: true,
        platformPostId: `webhook-${Date.now()}`,
        publishedAt: new Date().toISOString(),
        raw: { status: res.status, response: responseJson },
      };
    } catch (err) {
      return {
        ok: false,
        raw: { error: err instanceof Error ? err.message : String(err) },
      };
    }
  },
};
