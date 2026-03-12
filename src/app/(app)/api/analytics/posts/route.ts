/**
 * Phase 6: GET /api/analytics/posts — Posts table with latest rollup data
 *
 * Returns per-delivery rows joined with schedule/post info + latest totals.
 */

import { NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    // Get all rollups with delivery + schedule + post info
    const { data: rollups, error } = await supabase
      .from('engagement_rollups')
      .select(`
        id, post_delivery_id, platform_id, totals, deltas_24h,
        last_captured_at, updated_at,
        delivery:post_deliveries (
          id, platform_id, platform_post_id, status, caption,
          published_at, last_error,
          schedule:post_schedules (
            id, scheduled_for, status,
            post:publisher_posts ( id, title, channel_id, status )
          )
        )
      `)
      .eq('user_id', 'default')
      .order('last_captured_at', { ascending: false });

    if (error) throw error;

    // Also fetch error counts per delivery (snapshots with ok=false)
    const deliveryIds = (rollups || []).map((r) => r.post_delivery_id);
    const errorCounts: Record<string, number> = {};

    if (deliveryIds.length > 0) {
      const { data: errorSnapshots } = await supabase
        .from('engagement_snapshots')
        .select('post_delivery_id')
        .in('post_delivery_id', deliveryIds)
        .eq('ok', false);

      if (errorSnapshots) {
        for (const s of errorSnapshots) {
          errorCounts[s.post_delivery_id] = (errorCounts[s.post_delivery_id] || 0) + 1;
        }
      }
    }

    const posts = (rollups || []).map((r) => ({
      ...r,
      errorCount: errorCounts[r.post_delivery_id] || 0,
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching analytics posts:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics posts' }, { status: 500 });
  }
}
