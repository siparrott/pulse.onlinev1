/**
 * Phase 4: GET /api/posts/:id/variants
 *
 * Returns persisted variant metadata with refreshed signed URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchVariants } from '@/lib/storage/saveVariant';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;

  try {
    const variants = await fetchVariants(postId);

    return NextResponse.json({
      ok: true,
      postId,
      variants: variants.map((v) => ({
        id: v.id,
        platformId: v.platformId,
        width: v.width,
        height: v.height,
        format: v.format,
        bytes: v.bytes,
        upscaleWarning: v.upscaleWarning,
        publicUrl: v.publicUrl,
        storageKey: v.storageKey,
        createdAt: v.createdAt,
      })),
    });
  } catch (err) {
    console.error('[get-variants] error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
