/**
 * Phase 3A: Worker Entry Point
 *
 * Standalone Node process that runs outside Next.js.
 * Polls the generation_jobs table and processes AI image generation.
 *
 * Usage:
 *   npx tsx src/worker/index.ts          (dev)
 *   npm run worker                       (render.yaml)
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * Optional env vars:
 *   WORKER_POLL_INTERVAL_MS    (default: 2000)
 *   OPENAI_IMAGE_CONCURRENCY   (default: 2)
 *   OPENAI_VISION_CONCURRENCY  (default: 4)
 *   AI_KILL_SWITCH             (default: false)
 *   AI_DAILY_LIMIT             (default: 500)
 */

import { createClient } from '@supabase/supabase-js';
import { startPollLoop } from './poll-loop';

// ─── Boot ───────────────────────────────────────────

console.log('═══════════════════════════════════════');
console.log('  Pulse.Online Worker — Phase 3A');
console.log('═══════════════════════════════════════');

// Validate required env vars
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

const missing: string[] = [];
if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
if (!openaiKey) missing.push('OPENAI_API_KEY');

if (missing.length > 0) {
  console.error(`❌ Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// Create Supabase client with service-role key (elevated privileges)
const supabase = createClient(supabaseUrl!, serviceRoleKey!);

// ─── Configuration ──────────────────────────────────

const pollIntervalMs = parseInt(process.env.WORKER_POLL_INTERVAL_MS || '2000', 10);
const imgConcurrency = process.env.OPENAI_IMAGE_CONCURRENCY || '2';
const visConcurrency = process.env.OPENAI_VISION_CONCURRENCY || '4';
const killSwitch = process.env.AI_KILL_SWITCH === 'true';

console.log(`  Poll interval:        ${pollIntervalMs}ms`);
console.log(`  Image concurrency:    ${imgConcurrency}`);
console.log(`  Vision concurrency:   ${visConcurrency}`);
console.log(`  Kill switch:          ${killSwitch ? '🔴 ON' : '🟢 OFF'}`);
console.log(`  Supabase URL:         ${supabaseUrl!.substring(0, 30)}…`);
console.log('═══════════════════════════════════════\n');

if (killSwitch) {
  console.warn('⚠️  AI_KILL_SWITCH is ON — worker will poll but skip all jobs');
}

// ─── Graceful Shutdown ──────────────────────────────

const abortController = new AbortController();

function shutdown(signal: string) {
  console.log(`\n[worker] Received ${signal} — shutting down gracefully…`);
  abortController.abort();

  // Give in-flight jobs 10 seconds to finish
  setTimeout(() => {
    console.log('[worker] Force exit after timeout');
    process.exit(0);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled errors so one bad job never crashes the process
process.on('uncaughtException', (err) => {
  console.error('[worker] Uncaught exception (process will continue):', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[worker] Unhandled rejection (process will continue):', reason);
});

// ─── Start ──────────────────────────────────────────

startPollLoop(supabase, pollIntervalMs, abortController.signal);
