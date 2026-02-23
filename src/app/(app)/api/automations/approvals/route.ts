/**
 * Phase 7: GET/POST /api/automations/approvals
 *
 * GET  — list pending approvals
 * POST — approve or reject an action
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ approvals: [] });
  }

  const supabase = createServerClient();

  // Fetch pending approvals with action log details
  const { data: approvals, error } = await supabase
    .from('automation_approvals')
    .select(`
      id, action_log_id, user_id, status, decided_at, note, created_at
    `)
    .eq('status', 'pending')
    .eq('user_id', 'default')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with action log data
  const enriched = [];
  for (const approval of (approvals ?? [])) {
    const { data: actionLog } = await supabase
      .from('automation_action_logs')
      .select('id, rule_id, post_delivery_id, post_schedule_id, platform_id, action_type, payload, reason, created_at')
      .eq('id', approval.action_log_id)
      .single();

    let ruleName = '';
    let postTitle = '';
    let publishedAt = '';

    if (actionLog) {
      // Get rule name
      const { data: rule } = await supabase
        .from('automation_rules')
        .select('name')
        .eq('id', actionLog.rule_id)
        .single();
      ruleName = rule?.name ?? '';

      // Get post info via delivery → schedule → post
      if (actionLog.post_delivery_id) {
        const { data: delivery } = await supabase
          .from('post_deliveries')
          .select('published_at, post_schedule_id')
          .eq('id', actionLog.post_delivery_id)
          .single();

        if (delivery?.post_schedule_id) {
          const { data: schedule } = await supabase
            .from('post_schedules')
            .select('post_id')
            .eq('id', delivery.post_schedule_id)
            .single();
          if (schedule?.post_id) {
            const { data: post } = await supabase
              .from('publisher_posts')
              .select('caption, theme')
              .eq('id', schedule.post_id)
              .single();
            postTitle = post?.theme || (post?.caption?.slice(0, 60) + '...') || 'Untitled';
          }
          publishedAt = delivery.published_at ?? '';
        }
      }
    }

    enriched.push({
      ...approval,
      actionLog,
      ruleName,
      postTitle,
      publishedAt,
    });
  }

  return NextResponse.json({ approvals: enriched });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await request.json();
  const { approval_id, decision, note } = body;

  if (!approval_id || !['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'approval_id and decision (approved|rejected) required' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: approval, error } = await supabase
    .from('automation_approvals')
    .update({
      status: decision,
      decided_at: new Date().toISOString(),
      note: note ?? null,
    })
    .eq('id', approval_id)
    .eq('user_id', 'default')
    .select('*, action_log_id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update the action log status based on decision
  if (decision === 'approved') {
    await supabase
      .from('automation_action_logs')
      .update({ status: 'queued' })
      .eq('id', approval.action_log_id);
  } else {
    await supabase
      .from('automation_action_logs')
      .update({ status: 'skipped', reason: `Rejected: ${note || 'No reason given'}` })
      .eq('id', approval.action_log_id);
  }

  return NextResponse.json({ approval });
}
