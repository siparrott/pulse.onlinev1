/**
 * Phase 6: GET /api/analytics/overview — Aggregate metrics for the overview dashboard
 *
 * Query params:
 *   days=7|14|30 (default 7)
 *
 * Returns:
 *   totals: aggregated NormalizedMetrics across all deliveries
 *   avgEngagementRate: average ER%
 *   deliveryCount: how many deliveries have rollups
 *   timeSeries: day-by-day view/impression counts from snapshots
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const supabase = createServerClient();

    // Rollups for totals
    const { data: rollups } = await supabase
      .from('engagement_rollups')
      .select('totals, platform_id')
      .eq('user_id', 'default');

    let totalLikes = 0, totalComments = 0, totalShares = 0, totalSaves = 0;
    let totalViews = 0, totalImpressions = 0, totalReach = 0, totalClicks = 0;
    let erSum = 0, erCount = 0;
    const platformBreakdown: Record<string, { likes: number; comments: number; shares: number; views: number; impressions: number; count: number }> = {};

    for (const r of rollups || []) {
      const t = r.totals as Record<string, number | null>;
      totalLikes += t.likes ?? 0;
      totalComments += t.comments ?? 0;
      totalShares += t.shares ?? 0;
      totalSaves += t.saves ?? 0;
      totalViews += t.views ?? 0;
      totalImpressions += t.impressions ?? 0;
      totalReach += t.reach ?? 0;
      totalClicks += t.clicks ?? 0;

      if (t.engagementRate != null) {
        erSum += t.engagementRate;
        erCount++;
      }

      if (!platformBreakdown[r.platform_id]) {
        platformBreakdown[r.platform_id] = { likes: 0, comments: 0, shares: 0, views: 0, impressions: 0, count: 0 };
      }
      const pb = platformBreakdown[r.platform_id];
      pb.likes += t.likes ?? 0;
      pb.comments += t.comments ?? 0;
      pb.shares += t.shares ?? 0;
      pb.views += t.views ?? 0;
      pb.impressions += t.impressions ?? 0;
      pb.count++;
    }

    // Time series: snapshots grouped by date
    const { data: snapshots } = await supabase
      .from('engagement_snapshots')
      .select('captured_at, metrics')
      .eq('user_id', 'default')
      .eq('ok', true)
      .gte('captured_at', since)
      .order('captured_at', { ascending: true });

    // Group by date
    const byDate: Record<string, { views: number; impressions: number; likes: number; engagements: number }> = {};
    for (const s of snapshots || []) {
      const date = s.captured_at.slice(0, 10);
      if (!byDate[date]) byDate[date] = { views: 0, impressions: 0, likes: 0, engagements: 0 };
      const m = s.metrics as Record<string, number | null>;
      byDate[date].views += m.views ?? 0;
      byDate[date].impressions += m.impressions ?? 0;
      byDate[date].likes += m.likes ?? 0;
      byDate[date].engagements += (m.likes ?? 0) + (m.comments ?? 0) + (m.shares ?? 0) + (m.saves ?? 0);
    }

    const timeSeries = Object.entries(byDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totals: {
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        saves: totalSaves,
        views: totalViews,
        impressions: totalImpressions,
        reach: totalReach,
        clicks: totalClicks,
      },
      avgEngagementRate: erCount > 0 ? Math.round((erSum / erCount) * 100) / 100 : null,
      deliveryCount: rollups?.length ?? 0,
      platformBreakdown,
      timeSeries,
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
