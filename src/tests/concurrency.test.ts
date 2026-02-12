/**
 * Phase 3A: Concurrency Semaphore Tests
 */

import { describe, it, expect } from 'vitest';
import { Semaphore } from '@/lib/ai/concurrency';

describe('Semaphore', () => {
  it('allows up to max concurrent operations', async () => {
    const sem = new Semaphore(2);
    let running = 0;
    let maxRunning = 0;

    const task = () =>
      sem.run(async () => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((r) => setTimeout(r, 50));
        running--;
        return 'done';
      });

    const results = await Promise.all([task(), task(), task(), task()]);

    expect(results).toEqual(['done', 'done', 'done', 'done']);
    expect(maxRunning).toBe(2); // Never exceeded concurrency limit
  });

  it('tracks inFlight and queueLength', async () => {
    const sem = new Semaphore(1);

    expect(sem.inFlight).toBe(0);
    expect(sem.queueLength).toBe(0);

    // Acquire the single slot
    await sem.acquire();
    expect(sem.inFlight).toBe(1);
    expect(sem.queueLength).toBe(0);

    // Next acquire should wait
    const p = sem.acquire(); // Will queue
    // Give microtask a chance to register
    await new Promise((r) => setTimeout(r, 0));
    expect(sem.queueLength).toBe(1);

    // Release the slot — queued task should get it
    sem.release();
    await p;
    expect(sem.inFlight).toBe(1);
    expect(sem.queueLength).toBe(0);

    sem.release();
    expect(sem.inFlight).toBe(0);
  });

  it('releases slot on error', async () => {
    const sem = new Semaphore(1);

    await expect(
      sem.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    // Slot should be released despite error
    expect(sem.inFlight).toBe(0);
  });

  it('handles single concurrency correctly', async () => {
    const sem = new Semaphore(1);
    const order: number[] = [];

    const task = (id: number) =>
      sem.run(async () => {
        order.push(id);
        await new Promise((r) => setTimeout(r, 10));
      });

    await Promise.all([task(1), task(2), task(3)]);

    // All should complete in order since concurrency = 1
    expect(order).toEqual([1, 2, 3]);
  });
});
