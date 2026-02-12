/**
 * Phase 3A: Adaptive Retry with Exponential Backoff + Jitter
 *
 * Wraps any async function with configurable retry logic:
 *   - Exponential backoff: base × 2^attempt
 *   - Random jitter to prevent thundering herd
 *   - Retry-After header parsing for 429 responses
 *   - Configurable max attempts
 *
 * Server-side only — used by the worker for OpenAI calls.
 */

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Base delay in milliseconds before first retry. Default: 1000 */
  baseDelayMs?: number;
  /** Maximum jitter added to each delay in ms. Default: 500 */
  jitterMs?: number;
  /** Maximum delay cap in ms. Default: 30000 */
  maxDelayMs?: number;
  /** Called before each retry — useful for logging. */
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

export interface RetryableError extends Error {
  status?: number;
  headers?: { get(name: string): string | null };
}

/**
 * Execute `fn` with retry logic.
 *
 * Retries on:
 *   - HTTP 429 (rate limit)
 *   - HTTP 500/502/503/504 (transient server errors)
 *   - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 *
 * Does NOT retry on:
 *   - HTTP 400/401/403 (client errors)
 *   - Content policy violations
 *   - Config errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    jitterMs = 500,
    maxDelayMs = 30_000,
    onRetry,
  } = opts;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const error = err as RetryableError;
      lastError = error;

      // Don't retry on non-retryable errors
      if (!isRetryable(error)) {
        throw error;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= maxAttempts) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, error, {
        baseDelayMs,
        jitterMs,
        maxDelayMs,
      });

      onRetry?.(attempt, delay, error);

      await sleep(delay);
    }
  }

  throw lastError ?? new Error('withRetry: exhausted all attempts');
}

/**
 * Determine if an error is worth retrying.
 */
function isRetryable(error: RetryableError): boolean {
  // Rate limit — always retry
  if (error.status === 429) return true;

  // Transient server errors
  if (error.status && error.status >= 500 && error.status < 600) return true;

  // Network errors
  const msg = error.message?.toLowerCase() || '';
  if (
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('network') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }

  // Content policy — do NOT retry (will always fail)
  if (msg.includes('content_policy') || msg.includes('safety')) return false;

  // Config errors — do NOT retry
  if ((error as Error & { code?: string }).code === 'config_missing') return false;

  return false;
}

/**
 * Calculate delay with exponential backoff + jitter + Retry-After.
 */
function calculateDelay(
  attempt: number,
  error: RetryableError,
  opts: { baseDelayMs: number; jitterMs: number; maxDelayMs: number }
): number {
  // Check for Retry-After header (429 responses)
  const retryAfter = error.headers?.get?.('retry-after');
  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds) && seconds > 0) {
      // Use Retry-After + small jitter
      return Math.min(
        seconds * 1000 + Math.random() * opts.jitterMs,
        opts.maxDelayMs
      );
    }
  }

  // Exponential backoff: base × 2^(attempt-1)
  const exponential = opts.baseDelayMs * Math.pow(2, attempt - 1);
  const jitter = Math.random() * opts.jitterMs;
  return Math.min(exponential + jitter, opts.maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
