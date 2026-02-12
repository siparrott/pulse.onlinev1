/**
 * Phase 3A: Generation Job Types
 * Shared between the web API and the Render worker.
 */

export type GenerationJobStatus = 'queued' | 'processing' | 'done' | 'failed' | 'dead';

export interface GenerationJob {
  id: string;
  post_id: string;
  channel_id: string;
  platform_key: string;
  target_aspect: string;
  idempotency_key: string;
  status: GenerationJobStatus;
  attempts: number;
  max_attempts: number;
  next_run_at: string;

  // Input snapshot
  prompt_hash: string;
  brand_pack_hash: string;
  caption_hash: string;
  prompt_text: string;
  brand_pack_id: string | null;
  channel_code: string;
  post_caption: string;

  // Result (null until done)
  storage_path: string | null;
  storage_sha256: string | null;
  result_width: number | null;
  result_height: number | null;
  result_mime_type: string | null;
  revised_prompt: string | null;
  vision_verdict: Record<string, unknown> | null;
  vision_issues: Array<Record<string, unknown>> | null;
  vision_status: 'ok' | 'warn' | 'blocked' | null;
  governance_json: Record<string, unknown> | null;

  // Error (null unless failed)
  error_code: string | null;
  error_message: string | null;

  created_at: string;
  updated_at: string;
}

/**
 * What the POST /api/generate-variant-image route returns.
 */
export interface EnqueueResult {
  jobId: string;
  status: GenerationJobStatus;
  /** If the idempotency key matched an existing 'done' job, we return the cached result. */
  cached: boolean;
  /** Present only when cached=true */
  result?: JobPollResult;
}

/**
 * What the GET /api/generation-jobs/[jobId] route returns.
 */
export interface JobPollResult {
  jobId: string;
  status: GenerationJobStatus;
  signedUrl: string | null;
  storagePath: string | null;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  revisedPrompt: string | null;
  visionVerdict: Record<string, unknown> | null;
  visionIssues: Array<Record<string, unknown>> | null;
  visionStatus: 'ok' | 'warn' | 'blocked' | null;
  governance: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  platformKey: string;
  targetAspect: string;
  attempts: number;
  createdAt: string;
}
