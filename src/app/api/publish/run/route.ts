import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

// DRY RUN publishing pipeline
// This simulates publishing without actually posting to external platforms

interface PublishResult {
  post_id: string;
  platform: string;
  status: 'dry_run' | 'exported' | 'failed';
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { post_ids, dry_run = true } = await request.json();

    // Fetch posts to publish
    let query = supabase
      .from('publisher_posts')
      .select(`
        *,
        channel:publisher_channels(name, product_code, allowed_platforms),
        assets:publisher_assets(*)
      `)
      .eq('status', 'scheduled');

    if (post_ids && post_ids.length > 0) {
      query = query.in('id', post_ids);
    }

    const { data: posts, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        message: 'No scheduled posts to publish',
        results: [],
      });
    }

    const results: PublishResult[] = [];

    for (const post of posts) {
      for (const platform of post.platform_targets) {
        // Check if platform has a connector (in v1, all are dry-run)
        const hasConnector = false; // Placeholder for future platform integrations

        if (dry_run || !hasConnector) {
          results.push({
            post_id: post.id,
            platform,
            status: 'dry_run',
            message: `[DRY RUN] Would publish to ${platform}: "${post.caption.substring(0, 50)}..."`,
          });
        } else {
          // Future: Actual platform publishing
          results.push({
            post_id: post.id,
            platform,
            status: 'exported',
            message: `Marked for manual export to ${platform}`,
          });
        }
      }

      // Update post status
      const newStatus = dry_run ? 'scheduled' : 'published';
      
      if (!dry_run) {
        await supabase
          .from('publisher_posts')
          .update({ status: newStatus })
          .eq('id', post.id);
      }

      // Log publish event
      await supabase.from('publisher_governance_events').insert({
        channel_id: post.channel_id,
        post_id: post.id,
        event_type: dry_run ? 'dry_run_publish' : 'publish',
        payload: {
          platforms: post.platform_targets,
          dry_run,
          timestamp: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      message: dry_run
        ? `Dry run complete for ${posts.length} posts`
        : `Published ${posts.length} posts`,
      dry_run,
      results,
    });
  } catch (error) {
    console.error('Error in publish pipeline:', error);
    return NextResponse.json(
      { error: 'Failed to run publish pipeline' },
      { status: 500 }
    );
  }
}
