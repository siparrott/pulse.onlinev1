/**
 * Phase 3A: Adaptive Concurrency Semaphore
 *
 * Limits parallel OpenAI calls to prevent rate-limit storms.
 * Concurrency values are config-driven via env vars:
 *
 *   OPENAI_IMAGE_CONCURRENCY  (default: 2)
 *   OPENAI_VISION_CONCURRENCY (default: 4)
 *
 * Start conservative, raise once 429s disappear from logs.
 */

/**
 * Simple counting semaphore.
 * Callers `acquire()` a slot, do work, then `release()`.
 * If all slots are taken, `acquire()` awaits until one frees up.
 */
export class Semaphore {
  private current = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(public readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    // Wait for a slot to free up
    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }

  /** Run fn inside a semaphore slot. Releases on completion or error. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /** Current number of in-flight slots. */
  get inFlight(): number {
    return this.current;
  }

  /** Number of callers waiting for a slot. */
  get queueLength(): number {
    return this.waiting.length;
  }
}

// ─── Singleton instances (module-level, per-process) ─

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) || n < 1 ? fallback : n;
}

/** Semaphore for gpt-image-1 calls. Default: 2 concurrent. */
export const imageSemaphore = new Semaphore(
  envInt('OPENAI_IMAGE_CONCURRENCY', 2)
);

/** Semaphore for gpt-4o vision calls. Default: 4 concurrent. */
export const visionSemaphore = new Semaphore(
  envInt('OPENAI_VISION_CONCURRENCY', 4)
);
