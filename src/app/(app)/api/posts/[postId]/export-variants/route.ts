/**
 * Phase 4: GET /api/posts/:postId/export-variants.zip
 *
 * Streams a ZIP archive containing all built variants
 * plus a manifest.json at root.
 */

import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { Readable } from 'stream';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    // ── 1. Fetch post metadata ──────────────────────────────
    const { data: post, error: postErr } = await supabase
      .from('publisher_posts')
      .select('id, source_image, selected_platforms, variant_strategy, created_at')
      .eq('id', postId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ ok: false, error: 'Post not found' }, { status: 404 });
    }

    // ── 2. Fetch variant rows ───────────────────────────────
    const { data: variants, error: varErr } = await supabase
      .from('post_variants')
      .select('*')
      .eq('post_id', postId)
      .order('platform_id');

    if (varErr || !variants?.length) {
      return NextResponse.json(
        { ok: false, error: 'No variants found. Build them first.' },
        { status: 404 }
      );
    }

    // ── 3. Build ZIP ────────────────────────────────────────
    const archive = archiver('zip', { zlib: { level: 5 } });

    // Collect chunks into a buffer (Next.js doesn't support piped streams
    // easily in the App Router, so we buffer then respond)
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const archiveFinished = new Promise<Buffer>((resolve, reject) => {
      archive.on('end', () => resolve(Buffer.concat(chunks)));
      archive.on('error', reject);
    });

    // Download each variant file and append to archive
    for (const v of variants) {
      const { data: file, error: dlErr } = await supabase.storage
        .from('publisher-assets')
        .download(v.storage_key);

      if (dlErr || !file) {
        console.error(`[export-zip] skip ${v.platform_id}: ${dlErr?.message}`);
        continue;
      }

      const buf = Buffer.from(await file.arrayBuffer());
      const filename = v.storage_key.split('/').pop() ?? `${v.platform_id}.jpg`;
      archive.append(buf, { name: `${v.platform_id}/${filename}` });
    }

    // Manifest
    const manifest = {
      postId,
      createdAt: post.created_at,
      sourceImage: post.source_image,
      selectedPlatforms: post.selected_platforms,
      variants: variants.map((v: Record<string, unknown>) => ({
        platformId: v.platform_id,
        width: v.width,
        height: v.height,
        format: v.format,
        bytes: v.bytes,
        upscaleWarning: v.upscale_warning,
        storageKey: v.storage_key,
      })),
    };

    archive.append(JSON.stringify(manifest, null, 2), {
      name: 'manifest.json',
    });

    archive.finalize();

    const zipBuffer = await archiveFinished;

    return new Response(zipBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="variants_${postId.slice(0, 8)}.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
      },
    });
  } catch (err) {
    console.error('[export-variants] error:', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
