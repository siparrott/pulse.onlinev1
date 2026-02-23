/**
 * Phase 4: Variant Storage Service
 *
 * Saves generated variant buffers to Supabase Storage and
 * persists metadata rows to the `post_variants` table.
 *
 * Storage path convention:
 *   posts/{postId}/variants/{platformId}/{filename}
 */

import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { PostVariant } from '@/lib/types/database';

const BUCKET = 'publisher-assets';

export interface SaveVariantInput {
  buffer: Buffer;
  postId: string;
  platformId: string;
  filename: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  upscaleWarning: boolean;
}

/**
 * Upload a variant buffer to Supabase Storage and insert a
 * `post_variants` row.  Returns the persisted PostVariant record.
 */
export async function saveVariant(input: SaveVariantInput): Promise<PostVariant> {
  const storagePath = `posts/${input.postId}/variants/${input.platformId}/${input.filename}`;
  const contentType = mimeFor(input.format);

  if (!isSupabaseConfigured()) {
    // Fallback: return a local-only record (no real upload)
    return {
      id: crypto.randomUUID(),
      postId: input.postId,
      platformId: input.platformId,
      storageKey: storagePath,
      width: input.width,
      height: input.height,
      format: input.format,
      bytes: input.bytes,
      upscaleWarning: input.upscaleWarning,
      createdAt: new Date().toISOString(),
    };
  }

  const supabase = createServerClient();

  // 1. Upload to storage (upsert if re-building)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, input.buffer, {
      contentType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed for ${input.platformId}: ${uploadError.message}`);
  }

  // 2. Get signed URL (valid 1 hour)
  const { data: urlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);

  const publicUrl = urlData?.signedUrl ?? undefined;

  // 3. Persist DB row
  const { data: row, error: dbError } = await supabase
    .from('post_variants')
    .upsert(
      {
        post_id: input.postId,
        platform_id: input.platformId,
        storage_key: storagePath,
        public_url: publicUrl ?? null,
        width: input.width,
        height: input.height,
        format: input.format,
        bytes: input.bytes,
        upscale_warning: input.upscaleWarning,
      },
      { onConflict: 'post_id,platform_id' }
    )
    .select()
    .single();

  if (dbError) {
    throw new Error(`DB insert failed for ${input.platformId}: ${dbError.message}`);
  }

  return mapRow(row);
}

/**
 * Fetch all persisted variants for a post (with refreshed signed URLs).
 */
export async function fetchVariants(postId: string): Promise<PostVariant[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('post_variants')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[variants] fetch error:', error.message);
    return [];
  }

  // Refresh signed URLs
  const variants: PostVariant[] = [];
  for (const row of data ?? []) {
    const { data: urlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_key, 3600);

    variants.push({
      ...mapRow(row),
      publicUrl: urlData?.signedUrl ?? undefined,
    });
  }

  return variants;
}

/**
 * Delete all variants for a post (storage + DB rows).
 */
export async function deleteVariants(postId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createServerClient();

  // List existing rows to get storage keys
  const { data: rows } = await supabase
    .from('post_variants')
    .select('storage_key')
    .eq('post_id', postId);

  if (rows && rows.length > 0) {
    await supabase.storage
      .from(BUCKET)
      .remove(rows.map((r) => r.storage_key));
  }

  await supabase.from('post_variants').delete().eq('post_id', postId);
}

/**
 * Write a build log entry for observability.
 */
export async function logBuild(
  postId: string,
  count: number,
  durationMs: number,
  errors: string[]
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(`[variant-build] postId=${postId} count=${count} duration=${durationMs}ms errors=${errors.length}`);
    return;
  }

  const supabase = createServerClient();
  await supabase.from('variant_build_logs').insert({
    post_id: postId,
    count,
    duration_ms: durationMs,
    errors,
  });
}

// ── Helpers ──────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(row: any): PostVariant {
  return {
    id: row.id,
    postId: row.post_id,
    platformId: row.platform_id,
    storageKey: row.storage_key,
    publicUrl: row.public_url ?? undefined,
    width: row.width,
    height: row.height,
    format: row.format,
    bytes: row.bytes,
    upscaleWarning: row.upscale_warning ?? false,
    createdAt: row.created_at,
  };
}

function mimeFor(format: string): string {
  switch (format) {
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}
