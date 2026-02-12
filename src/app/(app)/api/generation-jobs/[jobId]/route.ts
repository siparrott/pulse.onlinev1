/**
 * Phase 3A: Job Polling Endpoint
 *
 * GET /api/generation-jobs/[jobId]
 *
 * Returns the current status of a generation job.
 * When status='done', includes a signed URL for the generated image.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { GenerationJob, JobPollResult } from '@/lib/types/generation-job';

const BUCKET = 'publisher-assets';
const SIGNED_URL_TTL = 300; // 5 minutes

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { message: 'Missing jobId parameter' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: 'Job not found' },
      { status: 404 }
    );
  }

  const job = data as GenerationJob;

  // Generate signed URL if the job is done and has a storage path
  let signedUrl: string | null = null;
  if (job.status === 'done' && job.storage_path) {
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(job.storage_path, SIGNED_URL_TTL);
    signedUrl = urlData?.signedUrl ?? null;
  }

  const result: JobPollResult = {
    jobId: job.id,
    status: job.status,
    signedUrl,
    storagePath: job.storage_path,
    width: job.result_width,
    height: job.result_height,
    mimeType: job.result_mime_type,
    revisedPrompt: job.revised_prompt,
    visionVerdict: job.vision_verdict,
    visionIssues: job.vision_issues,
    visionStatus: job.vision_status,
    governance: job.governance_json,
    errorCode: job.error_code,
    errorMessage: job.error_message,
    platformKey: job.platform_key,
    targetAspect: job.target_aspect,
    attempts: job.attempts,
    createdAt: job.created_at,
  };

  return NextResponse.json(result);
}
