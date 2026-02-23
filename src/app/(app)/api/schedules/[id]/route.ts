/**
 * Phase 5: GET /api/schedules/:id — Fetch a schedule with deliveries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    const { data: schedule, error: schedErr } = await supabase
      .from('post_schedules')
      .select(`
        *,
        post:publisher_posts ( id, title, channel_id, status ),
        deliveries:post_deliveries (
          id, platform_id, connection_id, variant_storage_key,
          caption, link_url, status, attempts, last_error,
          platform_post_id, published_at, next_retry_at, meta,
          created_at, updated_at
        )
      `)
      .eq('id', id)
      .single();

    if (schedErr || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
