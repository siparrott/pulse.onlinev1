/**
 * Phase 3A: Worker Poll Loop
 *
 * Continuously polls the generation_jobs table for queued work.
 * Picks up jobs in FIFO order (created_at) where next_run_at <= now().
 * Uses SELECT … FOR UPDATE SKIP LOCKED for safe multi-worker concurrency.
 *
 * Runs inside the Render worker process (src/worker/index.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { processJob } from './job-processor';
import type { GenerationJob } from '../lib/types/generation-job';

const BATCH_SIZE = 5; // Max jobs to pick up per poll cycle

export function startPollLoop(
  supabase: SupabaseClient,
  intervalMs: number,
  signal: AbortSignal
): void {
  let polling = false;

  async function tick() {
    if (signal.aborted) return;
    if (polling) return; // Skip overlapping tick
    polling = true;

    try {
      await pollOnce(supabase);
    } catch (err) {
      // Catch-all: one bad cycle must not crash the process
      console.error('[poll] Unhandled error in poll cycle:', err);
    } finally {
      polling = false;
    }
  }

  const handle = setInterval(tick, intervalMs);

  // Clean up on abort
  signal.addEventListener('abort', () => {
    clearInterval(handle);
    console.log('[poll] Poll loop stopped');
  });

  // First tick immediately
  void tick();

  console.log(`[poll] Started — interval ${intervalMs}ms, batch ${BATCH_SIZE}`);
}

/**
 * Single poll cycle: claim queued jobs and process them.
 */
async function pollOnce(supabase: SupabaseClient): Promise<void> {
  // Step 1: Fetch jobs that are ready to run
  // Note: Supabase JS client doesn't support FOR UPDATE SKIP LOCKED,
  // so we use a two-step claim pattern: SELECT → UPDATE with status check.
  const { data: candidates, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('status', 'queued')
    .lte('next_run_at', new Date().toISOString())
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[poll] Query failed:', error.message);
    return;
  }

  if (!candidates || candidates.length === 0) return;

  console.log(`[poll] Found ${candidates.length} candidate job(s)`);

  // Step 2: Try to claim each job atomically
  const claimedJobs: GenerationJob[] = [];

  for (const candidate of candidates) {
    const { data: claimed, error: claimError } = await supabase
      .from('generation_jobs')
      .update({ status: 'processing' })
      .eq('id', candidate.id)
      .eq('status', 'queued') // Only claim if still queued (CAS)
      .select()
      .single();

    if (claimError || !claimed) {
      // Another worker claimed it — skip
      continue;
    }

    // Push the claimed row (already has status='processing')
    claimedJobs.push(claimed as GenerationJob);
  }

  if (claimedJobs.length === 0) return;

  console.log(`[poll] Claimed ${claimedJobs.length} job(s)`);

  // Step 3: Process claimed jobs concurrently (semaphores will throttle)
  const promises = claimedJobs.map((job) =>
    processJob(supabase, job).catch((err) => {
      // This should never fire — processJob has its own try/catch
      console.error(`[poll] Unexpected error processing job ${job.id}:`, err);
    })
  );

  await Promise.allSettled(promises);
}
