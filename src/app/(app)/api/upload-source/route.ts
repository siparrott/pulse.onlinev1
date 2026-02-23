/**
 * Phase 4: POST /api/upload-source
 *
 * Uploads a source image to Supabase Storage.
 * Accepts multipart/form-data with 'file' and 'path' fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { ok: false, error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storagePath = formData.get('path') as string | null;

    if (!file || !storagePath) {
      return NextResponse.json(
        { ok: false, error: 'Missing file or path' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage (upsert in case of re-upload)
    const { error: uploadErr } = await supabase.storage
      .from('publisher-assets')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.error('Supabase Storage upload error:', uploadErr);
      return NextResponse.json(
        { ok: false, error: uploadErr.message },
        { status: 500 }
      );
    }

    // Get URL for reference
    const { data: urlData } = supabase.storage
      .from('publisher-assets')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      ok: true,
      storagePath,
      publicUrl: urlData?.publicUrl ?? null,
    });
  } catch (err) {
    console.error('upload-source error:', err);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
