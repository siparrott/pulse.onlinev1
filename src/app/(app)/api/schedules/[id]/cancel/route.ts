/**
 * Phase 5: POST /api/schedules/:id/cancel — Cancel a schedule if not yet published
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    // Fetch current schedule
    const { data: schedule, error: schedErr } = await supabase
      .from('post_schedules')
      .select('id, status, post_id')
      .eq('id', id)
      .single();

    if (schedErr || !schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Only allow cancellation from cancellable states
    const cancellable = ['draft', 'scheduled'];
    if (!cancellable.includes(schedule.status)) {
      return NextResponse.json(
        { error: `Cannot cancel schedule in status: ${schedule.status}` },
        { status: 409 }
      );
    }

    // Cancel the schedule
    const { error: updateErr } = await supabase
      .from('post_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateErr) {
      throw new Error(`Failed to cancel schedule: ${updateErr.message}`);
    }

    // Cancel all queued deliveries
    await supabase
      .from('post_deliveries')
      .update({ status: 'skipped' })
      .eq('post_schedule_id', id)
      .eq('status', 'queued');

    // Revert post status to draft
    await supabase
      .from('publisher_posts')
      .update({ status: 'draft', scheduled_at: null })
      .eq('id', schedule.post_id);

    return NextResponse.json({ schedule: { id, status: 'cancelled' } });
  } catch (error) {
    console.error('Error cancelling schedule:', error);
    return NextResponse.json({ error: 'Failed to cancel schedule' }, { status: 500 });
  }
}
