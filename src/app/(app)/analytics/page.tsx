'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Eye, Heart, MessageCircle, Share2, TrendingUp,
  RefreshCw, Loader2, ChevronRight, AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Tab = 'overview' | 'posts' | 'platforms';

interface OverviewData {
  totals: {
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
    impressions: number;
    reach: number;
    clicks: number;
  };
  avgEngagementRate: number | null;
  deliveryCount: number;
  platformBreakdown: Record<string, { likes: number; comments: number; shares: number; views: number; impressions: number; count: number }>;
  timeSeries: Array<{ date: string; views: number; impressions: number; likes: number; engagements: number }>;
}

interface PostRow {
  id: string;
  post_delivery_id: string;
  platform_id: string;
  totals: {
    likes?: number | null;
    comments?: number | null;
    shares?: number | null;
    views?: number | null;
    impressions?: number | null;
    engagementRate?: number | null;
  };
  last_captured_at: string | null;
  errorCount: number;
  delivery?: {
    id: string;
    platform_id: string;
    platform_post_id: string | null;
    status: string;
    caption: string;
    published_at: string | null;
    last_error: string | null;
    schedule?: {
      id: string;
      scheduled_for: string;
      status: string;
      post?: { id: string; title: string; channel_id: string } | null;
    } | null;
  } | null;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [days, setDays] = useState(7);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/overview?days=${days}`);
      if (res.ok) setOverview(await res.json());
    } catch { /* ignore */ }
  }, [days]);

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/analytics/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadPosts()]).finally(() => setLoading(false));
  }, [loadOverview, loadPosts]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'posts', label: 'Posts' },
    { id: 'platforms', label: 'Platforms' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-emerald-500" />
            Analytics
          </h1>
          <p className="text-zinc-400 text-sm">Engagement metrics across all published posts</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Day picker */}
          {tab === 'overview' && (
            <div className="flex bg-zinc-800 rounded-lg border border-zinc-700">
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => { setDays(d); }}
                  className={`px-3 py-1.5 text-xs transition-colors ${
                    days === d
                      ? 'bg-emerald-600 text-white rounded-lg'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
          <Button variant="secondary" onClick={() => { setLoading(true); Promise.all([loadOverview(), loadPosts()]).finally(() => setLoading(false)); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
              tab === t.id
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !overview ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab overview={overview} />}
          {tab === 'posts' && <PostsTab posts={posts} />}
          {tab === 'platforms' && <PlatformsTab overview={overview} />}
        </>
      )}
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────

function OverviewTab({ overview }: { overview: OverviewData | null }) {
  if (!overview) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-zinc-400">No analytics data yet</p>
          <p className="text-zinc-600 text-sm">Publish posts and run the engagement ingestion job to see data.</p>
        </CardContent>
      </Card>
    );
  }

  const t = overview.totals;
  const cards = [
    { label: 'Views', value: t.views, icon: Eye, color: 'text-blue-400' },
    { label: 'Impressions', value: t.impressions, icon: TrendingUp, color: 'text-purple-400' },
    { label: 'Likes', value: t.likes, icon: Heart, color: 'text-red-400' },
    { label: 'Comments', value: t.comments, icon: MessageCircle, color: 'text-amber-400' },
    { label: 'Shares', value: t.shares, icon: Share2, color: 'text-emerald-400' },
    { label: 'Clicks', value: t.clicks, icon: ChevronRight, color: 'text-cyan-400' },
  ];

  // Simple bar chart (CSS-based) for time series
  const maxViews = Math.max(...overview.timeSeries.map((d) => d.views || 1), 1);

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`h-4 w-4 ${c.color}`} />
                <span className="text-xs text-zinc-400">{c.label}</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatNumber(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement rate + delivery count */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <span className="text-xs text-zinc-400">Avg Engagement Rate</span>
            <p className="text-3xl font-bold text-emerald-400">
              {overview.avgEngagementRate != null ? `${overview.avgEngagementRate}%` : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <span className="text-xs text-zinc-400">Tracked Deliveries</span>
            <p className="text-3xl font-bold text-white">{overview.deliveryCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend chart (CSS bars) */}
      {overview.timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views Trend</CardTitle>
            <CardDescription>Daily views across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-40">
              {overview.timeSeries.map((d) => {
                const pct = Math.max((d.views / maxViews) * 100, 2);
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-emerald-500/70 rounded-t hover:bg-emerald-500 transition-colors"
                      style={{ height: `${pct}%` }}
                      title={`${d.date}: ${d.views} views`}
                    />
                    <span className="text-[9px] text-zinc-600 rotate-[-45deg] origin-top-left whitespace-nowrap">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Posts Tab ────────────────────────────────────────────────

function PostsTab({ posts }: { posts: PostRow[] }) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-zinc-400">No post analytics data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-zinc-400 font-medium">Post</th>
                <th className="text-left p-3 text-zinc-400 font-medium">Platform</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Likes</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Comments</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Shares</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Views</th>
                <th className="text-right p-3 text-zinc-400 font-medium">ER%</th>
                <th className="text-center p-3 text-zinc-400 font-medium">Status</th>
                <th className="text-right p-3 text-zinc-400 font-medium">Last Captured</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((row) => {
                const t = row.totals || {};
                const postTitle = row.delivery?.schedule?.post?.title || row.delivery?.caption?.slice(0, 40) || '—';
                const hasErrors = row.errorCount > 0;

                return (
                  <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="p-3">
                      <span className="text-zinc-200 font-medium truncate max-w-48 block">
                        {postTitle}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {row.delivery?.published_at ? formatDate(row.delivery.published_at) : ''}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant="default" className="capitalize text-[10px]">
                        {row.platform_id}
                      </Badge>
                    </td>
                    <td className="p-3 text-right text-zinc-300">{formatNumber(t.likes)}</td>
                    <td className="p-3 text-right text-zinc-300">{formatNumber(t.comments)}</td>
                    <td className="p-3 text-right text-zinc-300">{formatNumber(t.shares)}</td>
                    <td className="p-3 text-right text-zinc-300">{formatNumber(t.views)}</td>
                    <td className="p-3 text-right">
                      <span className={t.engagementRate != null ? 'text-emerald-400' : 'text-zinc-600'}>
                        {t.engagementRate != null ? `${t.engagementRate}%` : '—'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {hasErrors ? (
                        <Badge variant="warning" className="text-[10px]">
                          {row.errorCount} err
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">OK</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right text-xs text-zinc-500">
                      {formatDate(row.last_captured_at)}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/analytics/${row.post_delivery_id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          Details <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Platforms Tab ───────────────────────────────────────────

function PlatformsTab({ overview }: { overview: OverviewData | null }) {
  if (!overview || Object.keys(overview.platformBreakdown).length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-zinc-400">No platform breakdown data yet</p>
        </CardContent>
      </Card>
    );
  }

  const platforms = Object.entries(overview.platformBreakdown).sort(
    (a, b) => b[1].views - a[1].views
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {platforms.map(([platform, data]) => (
        <Card key={platform}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base capitalize flex items-center gap-2">
              {platform}
              <Badge variant="default" className="text-[10px]">{data.count} posts</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-zinc-500">Views</span>
                <p className="text-lg font-bold text-white">{formatNumber(data.views)}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Impressions</span>
                <p className="text-lg font-bold text-white">{formatNumber(data.impressions)}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Likes</span>
                <p className="text-lg font-bold text-white">{formatNumber(data.likes)}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Comments</span>
                <p className="text-lg font-bold text-white">{formatNumber(data.comments)}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Shares</span>
                <p className="text-lg font-bold text-white">{formatNumber(data.shares)}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500">Total Engagements</span>
                <p className="text-lg font-bold text-emerald-400">
                  {formatNumber(data.likes + data.comments + data.shares)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
