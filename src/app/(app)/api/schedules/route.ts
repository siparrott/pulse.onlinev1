/**
 * Phase 5: GET /api/schedules — List all schedules with deliveries
 */

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    const { data: schedules, error } = await supabase
      .from('post_schedules')
      .select(`
        *,
        post:publisher_posts ( id, title, channel_id, status ),
        deliveries:post_deliveries (
          id, platform_id, connection_id, status, attempts,
          last_error, platform_post_id, published_at, caption, meta,
          created_at, updated_at
        )
      `)
      .eq('user_id', 'default')
      .order('scheduled_for', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    return NextResponse.json({ schedules: schedules || [] });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}
