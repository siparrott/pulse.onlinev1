/**
 * Phase 3A: Re-sign URL Endpoint
 *
 * POST /api/sign-url
 * Body: { storagePath: string }
 *
 * Generates a fresh signed URL for a stored image.
 * Used when a previously signed URL has expired.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'publisher-assets';
const SIGNED_URL_TTL = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { storagePath } = await request.json();

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json(
        { message: 'Missing required field: storagePath' },
        { status: 400 }
      );
    }

    // Validate the path belongs to our bucket prefix
    if (!storagePath.startsWith('ai/')) {
      return NextResponse.json(
        { message: 'Invalid storage path' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { message: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresIn: SIGNED_URL_TTL,
    });
  } catch (error: unknown) {
    console.error('Sign URL error:', error);
    return NextResponse.json(
      { message: 'Failed to sign URL' },
      { status: 500 }
    );
  }
}
