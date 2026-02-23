'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Eye, Heart, MessageCircle, Share2, TrendingUp,
  RefreshCw, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SnapshotRow {
  id: string;
  captured_at: string;
  metrics: Record<string, number | null>;
  raw: Record<string, unknown>;
  ok: boolean;
  error: string | null;
}

interface EventRow {
  id: string;
  type: string;
  occurred_at: string;
  payload: Record<string, unknown>;
}

interface DetailData {
  delivery: {
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
  };
  rollup: {
    totals: Record<string, number | null>;
    deltas_24h: Record<string, number | null>;
    last_captured_at: string | null;
  } | null;
  snapshots: SnapshotRow[];
  events: EventRow[];
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

function formatDelta(n: number | null | undefined): string {
  if (n == null) return '';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n}`;
}

export default function PostAnalyticsDetailPage() {
  const params = useParams();
  const deliveryId = params.id as string;
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/post/${deliveryId}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [deliveryId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <p className="text-zinc-400">Delivery not found</p>
        <Link href="/analytics"><Button variant="secondary">Back to Analytics</Button></Link>
      </div>
    );
  }

  const { delivery, rollup, snapshots, events } = data;
  const t = rollup?.totals || {};
  const d24 = rollup?.deltas_24h || {};
  const title = delivery.schedule?.post?.title || delivery.caption?.slice(0, 60) || deliveryId;

  // Build time-series from snapshots (oldest first)
  const chartData = [...snapshots].reverse().filter((s) => s.ok);
  const maxViews = Math.max(...chartData.map((s) => s.metrics.views ?? 0), 1);

  const eventBadge: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    spike: 'info',
    milestone: 'success',
    comment: 'default' as 'info',
    error: 'error',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/analytics">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Analytics
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">{title}</h1>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Badge variant="default" className="capitalize text-[10px]">{delivery.platform_id}</Badge>
              {delivery.published_at && <span>Published {formatDate(delivery.published_at)}</span>}
            </div>
          </div>
        </div>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Totals cards */}
      {rollup && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { label: 'Views', val: t.views, delta: d24.views, icon: Eye, color: 'text-blue-400' },
            { label: 'Likes', val: t.likes, delta: d24.likes, icon: Heart, color: 'text-red-400' },
            { label: 'Comments', val: t.comments, delta: d24.comments, icon: MessageCircle, color: 'text-amber-400' },
            { label: 'Shares', val: t.shares, delta: d24.shares, icon: Share2, color: 'text-emerald-400' },
            { label: 'ER%', val: t.engagementRate, icon: TrendingUp, color: 'text-purple-400' },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                  <span className="text-[10px] text-zinc-500">{c.label}</span>
                </div>
                <p className="text-xl font-bold text-white">
                  {c.label === 'ER%' ? (c.val != null ? `${c.val}%` : '—') : formatNumber(c.val)}
                </p>
                {c.delta != null && (
                  <span className={`text-[10px] ${(c.delta as number) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatDelta(c.delta as number)} 24h
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Time-series chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Views Over Time</CardTitle>
            <CardDescription>Last {chartData.length} snapshots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-36">
              {chartData.map((s) => {
                const pct = Math.max(((s.metrics.views ?? 0) / maxViews) * 100, 2);
                return (
                  <div key={s.id} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500/70 rounded-t hover:bg-blue-500 transition-colors"
                      style={{ height: `${pct}%` }}
                      title={`${formatDate(s.captured_at)}: ${s.metrics.views ?? 0} views`}
                    />
                    <span className="text-[8px] text-zinc-600 rotate-[-45deg] origin-top-left whitespace-nowrap">
                      {s.captured_at.slice(5, 16).replace('T', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Snapshots table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Snapshots</CardTitle>
              <CardDescription>Last {snapshots.length} captures</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-zinc-500"
            >
              {showRaw ? 'Hide' : 'Show'} Raw
              {showRaw ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-900">
                  <tr className="border-b border-zinc-800">
                    <th className="text-left p-2 text-zinc-500">Time</th>
                    <th className="text-right p-2 text-zinc-500">Views</th>
                    <th className="text-right p-2 text-zinc-500">Likes</th>
                    <th className="text-right p-2 text-zinc-500">Cmts</th>
                    <th className="text-center p-2 text-zinc-500">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <>
                      <tr key={s.id} className="border-b border-zinc-800/30 hover:bg-zinc-800/20">
                        <td className="p-2 text-zinc-400 whitespace-nowrap">
                          {s.captured_at.slice(0, 16).replace('T', ' ')}
                        </td>
                        <td className="p-2 text-right text-zinc-300">{formatNumber(s.metrics.views)}</td>
                        <td className="p-2 text-right text-zinc-300">{formatNumber(s.metrics.likes)}</td>
                        <td className="p-2 text-right text-zinc-300">{formatNumber(s.metrics.comments)}</td>
                        <td className="p-2 text-center">
                          {s.ok ? (
                            <span className="text-emerald-400">✓</span>
                          ) : (
                            <span className="text-red-400" title={s.error || ''}>✗</span>
                          )}
                        </td>
                      </tr>
                      {showRaw && (
                        <tr key={`${s.id}-raw`}>
                          <td colSpan={5} className="p-2 bg-zinc-900/50">
                            <pre className="text-[10px] text-zinc-600 overflow-x-auto max-w-full">
                              {JSON.stringify(s.raw, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Events</CardTitle>
            <CardDescription>Spikes, milestones, and errors</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-8">No events detected yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 p-2 rounded bg-zinc-800/30">
                    <Badge variant={eventBadge[e.type] || 'default'} className="text-[10px] mt-0.5 capitalize">
                      {e.type}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-zinc-300">
                        {e.type === 'milestone' && `${(e.payload as Record<string, unknown>).field} reached ${(e.payload as Record<string, unknown>).threshold}`}
                        {e.type === 'spike' && `${(e.payload as Record<string, unknown>).field} spiked ${(e.payload as Record<string, unknown>).deltaPct}%`}
                        {e.type === 'error' && (e.payload as Record<string, unknown>).error as string}
                      </p>
                      <span className="text-[10px] text-zinc-600">{formatDate(e.occurred_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Connection/delivery error warning */}
      {delivery.last_error && (
        <Card className="border-red-900/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-400 font-medium">Delivery Error</p>
              <p className="text-xs text-zinc-500">{delivery.last_error}</p>
            </div>
            <Link href="/publishing" className="ml-auto">
              <Button variant="secondary" size="sm" className="text-xs">
                View Publishing
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
