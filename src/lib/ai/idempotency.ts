/**
 * Phase 3A: Idempotency Key Builder
 *
 * A deterministic compound key that uniquely identifies a generation request.
 * Same inputs → same key → skip regeneration (cache hit).
 *
 * Key components:
 *   postId + platformKey + targetAspect + brandPackHash + captionHash
 */

import { hashBrandPack } from '@/lib/ai/prompt-composer';

/**
 * Build a deterministic idempotency key for an AI generation request.
 *
 * Two requests with identical inputs will produce the same key,
 * allowing the API to return the cached result instead of re-generating.
 */
export function buildIdempotencyKey(params: {
  postId: string;
  platformKey: string;
  targetAspect: string;
  brandPackHash: string;
  captionHash: string;
}): string {
  const parts = [
    params.postId,
    params.platformKey,
    params.targetAspect,
    params.brandPackHash,
    params.captionHash,
  ];
  return parts.join('::');
}

/**
 * Hash a caption string for use in the idempotency key.
 * Uses the same djb2 hash as hashBrandPack for consistency.
 */
export function hashCaption(caption: string): string {
  return hashBrandPack({ caption } as Record<string, unknown>);
}

/**
 * Hash a full prompt string.
 */
export function hashPrompt(prompt: string): string {
  return hashBrandPack({ prompt } as Record<string, unknown>);
}
