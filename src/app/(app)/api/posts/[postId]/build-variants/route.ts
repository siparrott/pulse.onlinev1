/**
 * Phase 4: POST /api/posts/:postId/build-variants
 *
 * Triggers deterministic variant generation using Sharp.
 * Validates preconditions, runs the builder, saves to storage + DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { buildVariants } from '@/lib/images/variantBuilder';
import { saveVariant, logBuild, deleteVariants } from '@/lib/storage/saveVariant';
import type { PlatformSpecId } from '@/lib/platforms/specs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    // ── 1. Validate post exists ─────────────────────────────
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    const { data: post, error: postErr } = await supabase
      .from('publisher_posts')
      .select('id, variant_strategy, selected_platforms, source_image')
      .eq('id', postId)
      .single();

    if (postErr || !post) {
      return NextResponse.json(
        { ok: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // ── 2. Check strategy ───────────────────────────────────
    // Accept body override for strategy + platforms + source
    const body = await request.json().catch(() => ({}));

    const strategy = body.variant_strategy ?? post.variant_strategy ?? 'single_image';
    const selectedPlatforms: string[] =
      body.selected_platforms ?? post.selected_platforms ?? [];
    const sourceImage = body.source_image ?? post.source_image;

    if (strategy !== 'platform_safe') {
      return NextResponse.json(
        { ok: false, error: 'variant_strategy must be "platform_safe"' },
        { status: 400 }
      );
    }

    if (!selectedPlatforms.length) {
      return NextResponse.json(
        { ok: false, error: 'selected_platforms must not be empty' },
        { status: 400 }
      );
    }

    if (!sourceImage?.storageKey) {
      return NextResponse.json(
        { ok: false, error: 'sourceImage.storageKey is required' },
        { status: 400 }
      );
    }

    // ── 3. Download source from storage ─────────────────────
    const { data: sourceFile, error: dlErr } = await supabase.storage
      .from('publisher-assets')
      .download(sourceImage.storageKey);

    if (dlErr || !sourceFile) {
      return NextResponse.json(
        { ok: false, error: `Failed to download source: ${dlErr?.message ?? 'not found'}` },
        { status: 400 }
      );
    }

    const sourceBuffer = Buffer.from(await sourceFile.arrayBuffer());

    // ── 4. Delete previous variants (rebuild) ───────────────
    await deleteVariants(postId);

    // ── 5. Build variants ───────────────────────────────────
    const result = await buildVariants({
      sourceBuffer,
      platforms: selectedPlatforms as PlatformSpecId[],
      cropMode: body.cropMode ?? 'cover',
      slug: postId.slice(0, 8),
    });

    // ── 6. Save each variant ────────────────────────────────
    const savedVariants = [];
    for (const v of result.variants) {
      const saved = await saveVariant({
        buffer: v.buffer,
        postId,
        platformId: v.platformId,
        filename: v.filename,
        format: v.format,
        width: v.width,
        height: v.height,
        bytes: v.bytes,
        upscaleWarning: v.upscaleWarning,
      });
      savedVariants.push(saved);
    }

    // ── 7. Update post metadata ─────────────────────────────
    await supabase
      .from('publisher_posts')
      .update({
        variant_strategy: 'platform_safe',
        selected_platforms: selectedPlatforms,
        variant_generation_status: result.errors.some((e) => e.startsWith('[error]'))
          ? 'partial'
          : 'ready',
        variant_last_generated_at: new Date().toISOString(),
      })
      .eq('id', postId);

    // ── 8. Log build ────────────────────────────────────────
    await logBuild(postId, savedVariants.length, result.durationMs, result.errors);

    return NextResponse.json({
      ok: true,
      sourceWidth: result.sourceWidth,
      sourceHeight: result.sourceHeight,
      durationMs: result.durationMs,
      warnings: result.errors,
      variants: savedVariants.map((v) => ({
        id: v.id,
        platformId: v.platformId,
        width: v.width,
        height: v.height,
        format: v.format,
        bytes: v.bytes,
        upscaleWarning: v.upscaleWarning,
        publicUrl: v.publicUrl,
        storageKey: v.storageKey,
      })),
    });
  } catch (err) {
    console.error('[build-variants] error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
