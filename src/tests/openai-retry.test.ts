/**
 * Phase 3A: Retry + Backoff Tests
 *
 * Tests withRetry() behavior: exponential backoff, jitter,
 * Retry-After header parsing, non-retryable error passthrough.
 */

import { describe, it, expect, vi } from 'vitest';
import { withRetry, type RetryableError } from '@/lib/ai/openai-retry';

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds', async () => {
    const err429 = Object.assign(new Error('rate limited'), { status: 429 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err429)
      .mockResolvedValueOnce('ok');

    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10, // fast for tests
      jitterMs: 0,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 500 server errors', async () => {
    const err500 = Object.assign(new Error('internal error'), { status: 500 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err500)
      .mockResolvedValueOnce('recovered');

    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      jitterMs: 0,
    });

    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on network errors', async () => {
    const netErr = new Error('fetch failed');
    const fn = vi
      .fn()
      .mockRejectedValueOnce(netErr)
      .mockResolvedValueOnce('back');

    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      jitterMs: 0,
    });

    expect(result).toBe('back');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on content_policy errors', async () => {
    const policyErr = new Error('content_policy violation');
    const fn = vi.fn().mockRejectedValue(policyErr);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, jitterMs: 0 })
    ).rejects.toThrow('content_policy');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on config_missing errors', async () => {
    const configErr = Object.assign(new Error('no key'), { code: 'config_missing' });
    const fn = vi.fn().mockRejectedValue(configErr);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, jitterMs: 0 })
    ).rejects.toThrow('no key');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 400 client errors', async () => {
    const err400 = Object.assign(new Error('bad request'), { status: 400 });
    const fn = vi.fn().mockRejectedValue(err400);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, jitterMs: 0 })
    ).rejects.toThrow('bad request');

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting all attempts', async () => {
    const err = Object.assign(new Error('server down'), { status: 503 });
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withRetry(fn, { maxAttempts: 3, baseDelayMs: 10, jitterMs: 0 })
    ).rejects.toThrow('server down');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('calls onRetry callback for each retry', async () => {
    const err = Object.assign(new Error('503'), { status: 503 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce('ok');

    const onRetry = vi.fn();

    await withRetry(fn, {
      maxAttempts: 4,
      baseDelayMs: 10,
      jitterMs: 0,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toBe(1); // attempt 1
    expect(onRetry.mock.calls[1][0]).toBe(2); // attempt 2
  });

  it('respects Retry-After header on 429', async () => {
    const headers = {
      get: (name: string) => (name === 'retry-after' ? '1' : null),
    };
    const err429 = Object.assign(new Error('rate limited'), {
      status: 429,
      headers,
    }) as RetryableError;

    const fn = vi
      .fn()
      .mockRejectedValueOnce(err429)
      .mockResolvedValueOnce('ok');

    const onRetry = vi.fn();

    const start = Date.now();
    await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 10,
      jitterMs: 0,
      onRetry,
    });
    const elapsed = Date.now() - start;

    // Should have waited ~1000ms (Retry-After: 1 second)
    expect(elapsed).toBeGreaterThanOrEqual(900);
    expect(onRetry.mock.calls[0][1]).toBeGreaterThanOrEqual(900);
  });

  it('applies exponential backoff', async () => {
    const err = Object.assign(new Error('503'), { status: 503 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err) // attempt 1 fails
      .mockRejectedValueOnce(err) // attempt 2 fails
      .mockResolvedValueOnce('ok'); // attempt 3 succeeds

    const onRetry = vi.fn();

    await withRetry(fn, {
      maxAttempts: 4,
      baseDelayMs: 100,
      jitterMs: 0,
      onRetry,
    });

    // Attempt 1 → delay = 100 × 2^0 = 100
    // Attempt 2 → delay = 100 × 2^1 = 200
    expect(onRetry.mock.calls[0][1]).toBeGreaterThanOrEqual(95);
    expect(onRetry.mock.calls[0][1]).toBeLessThan(150);
    expect(onRetry.mock.calls[1][1]).toBeGreaterThanOrEqual(195);
    expect(onRetry.mock.calls[1][1]).toBeLessThan(250);
  });
});
