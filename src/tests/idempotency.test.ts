/**
 * Phase 3A: Idempotency Key Tests
 */

import { describe, it, expect } from 'vitest';
import { buildIdempotencyKey, hashCaption, hashPrompt } from '@/lib/ai/idempotency';

describe('buildIdempotencyKey', () => {
  const base = {
    postId: 'post-1',
    platformKey: 'instagram_feed',
    targetAspect: '1:1',
    brandPackHash: 'bp-abc123',
    captionHash: 'cap-def456',
  };

  it('produces a deterministic key from the same inputs', () => {
    const key1 = buildIdempotencyKey(base);
    const key2 = buildIdempotencyKey(base);
    expect(key1).toBe(key2);
  });

  it('uses :: as the separator', () => {
    const key = buildIdempotencyKey(base);
    expect(key.split('::').length).toBe(5);
    expect(key).toBe('post-1::instagram_feed::1:1::bp-abc123::cap-def456');
  });

  it('produces different keys when any component changes', () => {
    const original = buildIdempotencyKey(base);

    expect(buildIdempotencyKey({ ...base, postId: 'post-2' })).not.toBe(original);
    expect(buildIdempotencyKey({ ...base, platformKey: 'twitter' })).not.toBe(original);
    expect(buildIdempotencyKey({ ...base, targetAspect: '16:9' })).not.toBe(original);
    expect(buildIdempotencyKey({ ...base, brandPackHash: 'bp-xyz' })).not.toBe(original);
    expect(buildIdempotencyKey({ ...base, captionHash: 'cap-xyz' })).not.toBe(original);
  });

  it('handles empty strings gracefully', () => {
    const key = buildIdempotencyKey({
      postId: '',
      platformKey: '',
      targetAspect: '',
      brandPackHash: '',
      captionHash: '',
    });
    expect(key).toBe('::::::::');
  });
});

describe('hashCaption', () => {
  it('returns the same hash for the same input', () => {
    expect(hashCaption('Hello world')).toBe(hashCaption('Hello world'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashCaption('Hello')).not.toBe(hashCaption('World'));
  });

  it('handles empty string', () => {
    const hash = hashCaption('');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('handles unicode', () => {
    const hash = hashCaption('日本語テスト 🎉');
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('hashPrompt', () => {
  it('returns the same hash for the same prompt', () => {
    const prompt = 'Create a professional image showing a product on a clean background';
    expect(hashPrompt(prompt)).toBe(hashPrompt(prompt));
  });

  it('returns different hashes for different prompts', () => {
    expect(hashPrompt('prompt A')).not.toBe(hashPrompt('prompt B'));
  });

  it('is consistent between hashCaption and hashPrompt for same content structure', () => {
    // They both use hashBrandPack internally with different key names,
    // so same content should produce different hashes due to key difference
    const text = 'same content';
    expect(hashCaption(text)).not.toBe(hashPrompt(text));
  });
});
