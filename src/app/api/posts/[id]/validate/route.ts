import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { validatePost } from '@/lib/governance/validator';
import type { PublisherPost, PublisherChannel, PublisherAsset } from '@/lib/types/database';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    // Fetch post with channel and assets
    const { data: postData, error: postError } = await supabase
      .from('publisher_posts')
      .select(`
        *,
        channel:publisher_channels(*),
        assets:publisher_assets(*)
      `)
      .eq('id', id)
      .single();

    if (postError) throw postError;
    if (!postData) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const post = postData as PublisherPost & {
      channel: PublisherChannel;
      assets: PublisherAsset[];
    };

    // Run governance validation
    const result = validatePost(post, post.channel, post.assets);

    // Update post with governance result
    const newStatus =
      result.status === 'allowed'
        ? 'validated'
        : result.status === 'blocked'
        ? 'blocked'
        : 'needs_edits';

    const { error: updateError } = await supabase
      .from('publisher_posts')
      .update({
        governance_status: result.status,
        governance_score: result.score,
        governance_refusals: result.refusals,
        governance_unlock_path: result.unlock_path,
        status: newStatus,
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Log governance event
    await supabase.from('publisher_governance_events').insert({
      channel_id: post.channel_id,
      post_id: post.id,
      event_type: 'validation',
      payload: {
        result,
        profile: post.channel.governance_profile,
      },
    });

    return NextResponse.json({
      result,
      status: newStatus,
    });
  } catch (error) {
    console.error('Error validating post:', error);
    return NextResponse.json(
      { error: 'Failed to validate post' },
      { status: 500 }
    );
  }
}
