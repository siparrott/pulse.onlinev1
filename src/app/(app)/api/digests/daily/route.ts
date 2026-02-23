/**
 * Phase 6: GET /api/digests/daily?date=YYYY-MM-DD
 *
 * Generate or retrieve a daily engagement digest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { generateDailyDigest } from '@/lib/digests/dailyEngagementDigest';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().slice(0, 10);

  try {
    const { summary, markdown } = await generateDailyDigest(date);
    return NextResponse.json({ summary, markdown });
  } catch (error) {
    console.error('Error generating digest:', error);
    return NextResponse.json({ error: 'Failed to generate digest' }, { status: 500 });
  }
}
