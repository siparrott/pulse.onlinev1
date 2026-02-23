/**
 * Phase 5: POST /api/posts/:id/schedule — Create a PostSchedule + PostDeliveries
 *
 * Body: {
 *   scheduledFor: string (ISO timestamp),
 *   timezone: string,
 *   selectedPlatforms: string[],
 *   caption: string,
 *   connectionIdsByPlatform: Record<string, string>,
 *   linkUrl?: string,
 *   dryRun?: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  const { id: postId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const {
      scheduledFor,
      timezone = 'UTC',
      selectedPlatforms,
      caption,
      connectionIdsByPlatform,
      linkUrl,
      dryRun = false,
    } = body;

    // ── Validation ──────────────────────────────────────────
    if (!scheduledFor) {
      return NextResponse.json({ error: 'scheduledFor is required' }, { status: 400 });
    }
    if (!selectedPlatforms?.length) {
      return NextResponse.json({ error: 'selectedPlatforms must not be empty' }, { status: 400 });
    }
    if (!connectionIdsByPlatform || typeof connectionIdsByPlatform !== 'object') {
      return NextResponse.json({ error: 'connectionIdsByPlatform mapping is required' }, { status: 400 });
    }
    if (!caption?.trim()) {
      return NextResponse.json({ error: 'caption is required' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify post exists
    const { data: post, error: postErr } = await supabase
      .from('publisher_posts')
      .select('id, variant_strategy, selected_platforms, source_image')
      .eq('id', postId)
      .single();

    if (postErr || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Verify each platform has a connection
    for (const platform of selectedPlatforms) {
      const connId = connectionIdsByPlatform[platform];
      if (!connId) {
        return NextResponse.json(
          { error: `No connection specified for platform: ${platform}` },
          { status: 400 }
        );
      }

      const { data: conn, error: connErr } = await supabase
        .from('user_platform_connections')
        .select('id, status')
        .eq('id', connId)
        .single();

      if (connErr || !conn) {
        return NextResponse.json(
          { error: `Connection ${connId} not found for platform ${platform}` },
          { status: 400 }
        );
      }

      if (conn.status !== 'connected') {
        return NextResponse.json(
          { error: `Connection for ${platform} is ${conn.status}, not connected` },
          { status: 400 }
        );
      }
    }

    // ── Create PostSchedule ─────────────────────────────────
    const { data: schedule, error: schedErr } = await supabase
      .from('post_schedules')
      .insert({
        user_id: 'default',
        post_id: postId,
        timezone,
        scheduled_for: scheduledFor,
        status: 'scheduled',
        meta: { dryRun },
      })
      .select()
      .single();

    if (schedErr || !schedule) {
      throw new Error(`Failed to create schedule: ${schedErr?.message}`);
    }

    // ── Create PostDelivery rows ────────────────────────────
    // Look up variant storage keys per platform (if platform_safe strategy)
    let variantsByPlatform: Record<string, string> = {};
    if (post.variant_strategy === 'platform_safe') {
      const { data: variants } = await supabase
        .from('post_variants')
        .select('platform_id, storage_key')
        .eq('post_id', postId);

      if (variants) {
        for (const v of variants) {
          variantsByPlatform[v.platform_id] = v.storage_key;
        }
      }
    }

    const deliveryRows = selectedPlatforms.map((platform: string) => ({
      post_schedule_id: schedule.id,
      platform_id: platform,
      connection_id: connectionIdsByPlatform[platform],
      variant_storage_key: variantsByPlatform[platform] ?? null,
      caption,
      link_url: linkUrl ?? null,
      status: 'queued',
      attempts: 0,
      meta: { dryRun },
    }));

    const { data: deliveries, error: delErr } = await supabase
      .from('post_deliveries')
      .insert(deliveryRows)
      .select();

    if (delErr) {
      throw new Error(`Failed to create deliveries: ${delErr.message}`);
    }

    // Update post status to scheduled
    await supabase
      .from('publisher_posts')
      .update({ status: 'scheduled', scheduled_at: scheduledFor })
      .eq('id', postId);

    return NextResponse.json({
      schedule: { ...schedule, deliveries },
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
  }
}
