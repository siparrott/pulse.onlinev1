/**
 * Phase 3A: Job Processor
 *
 * Processes a single generation_job row through the full pipeline:
 *   1. Generate image via OpenAI (gpt-image-1) with retry + concurrency
 *   2. Upload to Supabase Storage (publisher-assets bucket)
 *   3. Run vision checks via OpenAI (gpt-4o)
 *   4. Compute governance result
 *   5. Update job row with results
 *   6. Increment daily quota
 *
 * Server-side only — runs inside the Render worker process.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
// Note: We use relative paths (not @/ aliases) because the worker runs
// outside Next.js via tsx — tsconfig paths aren't resolved automatically.
// This file is imported by poll-loop.ts which itself uses relative imports.
import { generateAIImage } from '../lib/ai/openai-image';
import { runBrandPackVisionChecks } from '../lib/ai/vision-checks';
import { withRetry } from '../lib/ai/openai-retry';
import { imageSemaphore, visionSemaphore } from '../lib/ai/concurrency';
import { incrementQuota } from '../lib/ai/cost-guard';
import { redactPII } from '../lib/utils/redact';
import type { GenerationJob } from '../lib/types/generation-job';
import type { BrandPack } from '../lib/types/database';

const BUCKET = 'publisher-assets';

export async function processJob(
  supabase: SupabaseClient,
  job: GenerationJob
): Promise<void> {
  const startedAt = Date.now();

  // Bump attempt counter (job already has status='processing' from the claim step)
  const currentAttempt = job.attempts + 1;
  await supabase
    .from('generation_jobs')
    .update({ attempts: currentAttempt })
    .eq('id', job.id);

  try {
    // ── Step 1: Generate image with retry + semaphore ──
    const genResult = await imageSemaphore.run(() =>
      withRetry(
        () =>
          generateAIImage({
            prompt: job.prompt_text,
            platformKey: job.platform_key,
            targetAspect: job.target_aspect,
          }),
        {
          maxAttempts: 3,
          baseDelayMs: 1500,
          jitterMs: 500,
          onRetry: (attempt, delayMs, err) => {
            console.log(
              `[job:${job.id}] Image gen retry ${attempt}, delay ${delayMs}ms: ${err.message}`
            );
          },
        }
      )
    );

    // ── Step 2: Upload to Supabase Storage ────────────
    const imageBuffer = Buffer.from(genResult.base64, 'base64');
    const sha256 = createHash('sha256').update(imageBuffer).digest('hex');

    // Check for content-addressed duplicate (same exact image already stored)
    const { data: existingBySha } = await supabase
      .from('generation_jobs')
      .select('storage_path')
      .eq('storage_sha256', sha256)
      .eq('status', 'done')
      .limit(1)
      .single();

    let storagePath: string;

    if (existingBySha?.storage_path) {
      // Reuse existing storage file — no upload needed
      storagePath = existingBySha.storage_path;
      console.log(`[job:${job.id}] Reusing existing image: ${storagePath}`);
    } else {
      storagePath = `ai/${job.channel_id}/${job.id}.png`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, imageBuffer, {
          contentType: genResult.mimeType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }
      console.log(`[job:${job.id}] Uploaded to ${storagePath}`);
    }

    // ── Step 3: Vision checks (if Brand Pack exists) ──
    let visionVerdict: Record<string, unknown> | null = null;
    let visionIssues: Array<Record<string, unknown>> | null = null;
    let visionStatus: 'ok' | 'warn' | 'blocked' | null = null;

    if (job.brand_pack_id) {
      // Fetch the Brand Pack
      const { data: brandPack } = await supabase
        .from('brand_packs')
        .select('*')
        .eq('id', job.brand_pack_id)
        .single();

      if (brandPack) {
        const bp = mapBrandPackRow(brandPack);
        const redactedCaption = redactPII(job.post_caption);

        const visionResult = await visionSemaphore.run(() =>
          withRetry(
            () =>
              runBrandPackVisionChecks({
                imageBase64: genResult.base64,
                imageMimeType: genResult.mimeType,
                brandPack: bp,
                platformKey: job.platform_key,
                targetAspect: job.target_aspect,
                postCaption: redactedCaption,
                channelCode: job.channel_code,
              }),
            {
              maxAttempts: 2,
              baseDelayMs: 1000,
              jitterMs: 300,
              onRetry: (attempt, delayMs, err) => {
                console.log(
                  `[job:${job.id}] Vision retry ${attempt}, delay ${delayMs}ms: ${err.message}`
                );
              },
            }
          )
        );

        visionVerdict = visionResult.verdict as unknown as Record<string, unknown>;
        visionIssues = visionResult.issues as unknown as Array<Record<string, unknown>>;
        visionStatus = visionResult.overallStatus;
      }
    }

    // ── Step 4: Build governance JSON ─────────────────
    const governance = {
      status: visionStatus || 'ok',
      score: visionStatus === 'blocked' ? 0 : visionStatus === 'warn' ? 50 : 100,
      issues: visionIssues || [],
    };

    // ── Step 5: Update job as done ────────────────────
    await supabase
      .from('generation_jobs')
      .update({
        status: 'done',
        storage_path: storagePath,
        storage_sha256: sha256,
        result_width: genResult.width,
        result_height: genResult.height,
        result_mime_type: genResult.mimeType,
        revised_prompt: genResult.revised_prompt || null,
        vision_verdict: visionVerdict,
        vision_issues: visionIssues,
        vision_status: visionStatus,
        governance_json: governance,
      })
      .eq('id', job.id);

    // ── Step 6: Increment daily quota ─────────────────
    await incrementQuota(supabase, job.channel_id);

    const elapsed = Date.now() - startedAt;
    console.log(
      `[job:${job.id}] ✓ Done in ${elapsed}ms — ${job.platform_key} ${job.target_aspect} → ${storagePath}`
    );
  } catch (err: unknown) {
    const error = err as Error & { code?: string; status?: number };
    const elapsed = Date.now() - startedAt;
    console.error(
      `[job:${job.id}] ✗ Failed after ${elapsed}ms (attempt ${currentAttempt}): ${error.message}`
    );

    const isRetryable =
      error.status === 429 ||
      (error.status && error.status >= 500) ||
      error.message?.includes('fetch failed') ||
      error.message?.includes('Storage upload failed');

    if (isRetryable && currentAttempt < job.max_attempts) {
      // Requeue with backoff
      const backoffMs = 1000 * Math.pow(2, currentAttempt) + Math.random() * 2000;
      const nextRunAt = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from('generation_jobs')
        .update({
          status: 'queued',
          next_run_at: nextRunAt,
          error_code: error.code || 'transient',
          error_message: error.message,
        })
        .eq('id', job.id);

      console.log(
        `[job:${job.id}] Requeued for retry at ${nextRunAt}`
      );
    } else {
      // Permanent failure or exhausted retries
      const finalStatus = currentAttempt >= job.max_attempts ? 'dead' : 'failed';

      await supabase
        .from('generation_jobs')
        .update({
          status: finalStatus,
          error_code: error.code || 'api_error',
          error_message: error.message || 'Unknown error',
        })
        .eq('id', job.id);

      if (finalStatus === 'dead') {
        console.error(
          `[job:${job.id}] ☠ Dead-lettered after ${currentAttempt} attempts`
        );
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────

/**
 * Map a Supabase brand_packs row (with camelCase quoted columns) to BrandPack type.
 */
function mapBrandPackRow(row: Record<string, unknown>): BrandPack {
  return {
    id: row.id as string,
    channelId: (row.channelId ?? row.channel_id) as string,
    identity: (row.identity ?? {}) as BrandPack['identity'],
    languageRules: (row.languageRules ?? row.language_rules ?? {}) as BrandPack['languageRules'],
    visualRules: (row.visualRules ?? row.visual_rules ?? {}) as BrandPack['visualRules'],
    aiPromptAnchors: (row.aiPromptAnchors ?? row.ai_prompt_anchors ?? {}) as BrandPack['aiPromptAnchors'],
    governanceOverrides: (row.governanceOverrides ?? row.governance_overrides ?? {}) as BrandPack['governanceOverrides'],
    examples: (row.examples ?? undefined) as BrandPack['examples'],
    completeness: (row.completeness ?? 0) as number,
    createdAt: (row.createdAt ?? row.created_at ?? '') as string,
    updatedAt: (row.updatedAt ?? row.updated_at ?? '') as string,
  };
}
