/**
 * Phase 6: GET /api/analytics/post/:id — Detailed analytics for a single delivery
 *
 * Returns the rollup + last 20 snapshots + events for a post_delivery_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { id: deliveryId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    // Rollup
    const { data: rollup } = await supabase
      .from('engagement_rollups')
      .select('*')
      .eq('post_delivery_id', deliveryId)
      .single();

    // Delivery info
    const { data: delivery } = await supabase
      .from('post_deliveries')
      .select(`
        *,
        schedule:post_schedules (
          id, scheduled_for, status,
          post:publisher_posts ( id, title, channel_id )
        )
      `)
      .eq('id', deliveryId)
      .single();

    // Last 20 snapshots
    const { data: snapshots } = await supabase
      .from('engagement_snapshots')
      .select('*')
      .eq('post_delivery_id', deliveryId)
      .order('captured_at', { ascending: false })
      .limit(20);

    // Events
    const { data: events } = await supabase
      .from('user_engagement_events')
      .select('*')
      .eq('post_delivery_id', deliveryId)
      .order('occurred_at', { ascending: false })
      .limit(20);

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    return NextResponse.json({
      delivery,
      rollup,
      snapshots: snapshots || [],
      events: events || [],
    });
  } catch (error) {
    console.error('Error fetching post analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch post analytics' }, { status: 500 });
  }
}
