/**
 * Phase 5: Publisher Interface
 *
 * Common interface that every platform publisher must implement.
 * Each publisher handles validation + actual posting for one platform.
 */

import type { UserPlatformConnection } from '@/lib/types/database';

export interface PublishPayload {
  /** The caption / text body to publish */
  caption: string;
  /** Optional link to attach */
  linkUrl?: string;
  /** Image buffer to upload (from Phase 4 variant) */
  imageBuffer?: Buffer;
  /** Image MIME type */
  imageMimeType?: string;
  /** Image filename */
  imageFilename?: string;
  /** Arbitrary metadata (dry-run flag, etc.) */
  meta?: Record<string, unknown>;
}

export interface PublishResult {
  ok: boolean;
  /** Platform-specific post ID (e.g. LinkedIn post URN) */
  platformPostId?: string;
  /** When the platform accepted the post */
  publishedAt?: string;
  /** Raw response from the platform (for debugging) */
  raw?: Record<string, unknown>;
}

export interface ValidateResult {
  ok: boolean;
  warnings: string[];
}

export interface Publisher {
  /** Which platform this publisher handles */
  platformId: string;
  /** What the publisher can do */
  supports: {
    immediate: boolean;
    scheduled: boolean;
    media: 'image' | 'video' | 'mixed';
  };
  /** Pre-flight validation before publishing */
  validate(connection: UserPlatformConnection, payload: PublishPayload): Promise<ValidateResult>;
  /** Actually publish the content */
  publish(connection: UserPlatformConnection, payload: PublishPayload): Promise<PublishResult>;
}
