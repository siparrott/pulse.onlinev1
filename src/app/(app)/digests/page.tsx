'use client';

import { useState, useEffect } from 'react';
import { Mail, Loader2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DigestSummary {
  date: string;
  topPosts: Array<{
    deliveryId: string;
    platformId: string;
    postTitle: string;
    deltaViews: number;
    totalViews: number;
    totalLikes: number;
  }>;
  events: Array<{
    type: string;
    platformId: string;
    description: string;
  }>;
  errors: Array<{
    deliveryId: string;
    platformId: string;
    error: string;
  }>;
  totalDeliveries: number;
  healthyDeliveries: number;
}

export default function DigestsPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<DigestSummary | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'markdown'>('cards');
  const [refreshKey, setRefreshKey] = useState(0);

  // Track date changes in render phase to set loading state synchronously
  const [prevDate, setPrevDate] = useState(date);
  if (date !== prevDate) {
    setPrevDate(date);
    setLoading(true);
    setSummary(null);
    setMarkdown('');
  }

  const handleRefresh = () => {
    setLoading(true);
    setSummary(null);
    setMarkdown('');
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/digests/daily?date=${date}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setSummary(data.summary);
          setMarkdown(data.markdown);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [date, refreshKey]);

  const goDay = (offset: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + offset);
    setDate(d.toISOString().slice(0, 10));
  };

  const eventBadge: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    spike: 'info',
    milestone: 'success',
    error: 'error',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="h-6 w-6 text-emerald-500" />
            Daily Digest
          </h1>
          <p className="text-zinc-400 text-sm">Daily engagement summary</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-800 rounded-lg border border-zinc-700 px-1">
            <button onClick={() => goDay(-1)} className="p-1.5 text-zinc-400 hover:text-white">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm text-zinc-200 border-none focus:outline-none px-2 py-1"
            />
            <button onClick={() => goDay(1)} className="p-1.5 text-zinc-400 hover:text-white">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="secondary" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 w-fit">
        {(['cards', 'markdown'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm capitalize transition-colors ${
              viewMode === m ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      ) : viewMode === 'markdown' ? (
        <Card>
          <CardContent className="py-6">
            <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
              {markdown || 'No digest data for this date.'}
            </pre>
          </CardContent>
        </Card>
      ) : summary ? (
        <div className="space-y-6">
          {/* Health */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-zinc-400">Tracked Deliveries</span>
                <p className="text-3xl font-bold text-white">{summary.totalDeliveries}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <span className="text-xs text-zinc-400">Healthy</span>
                <p className={`text-3xl font-bold ${
                  summary.healthyDeliveries === summary.totalDeliveries ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {summary.healthyDeliveries}/{summary.totalDeliveries}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Posts */}
          {summary.topPosts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Posts Today</CardTitle>
                <CardDescription>By view growth in the last 24h</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.topPosts.map((p, i) => (
                  <div key={p.deliveryId} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                    <span className="text-lg font-bold text-zinc-600 w-6 text-center">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 font-medium truncate">{p.postTitle}</p>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Badge variant="default" className="capitalize text-[10px]">{p.platformId}</Badge>
                        <span>{p.totalViews} views</span>
                        <span className="text-emerald-400">+{p.deltaViews} today</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Events */}
          {summary.events.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Events</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.events.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant={eventBadge[e.type] || 'default'} className="text-[10px] capitalize">
                      {e.type}
                    </Badge>
                    <span className="text-zinc-300">{e.description}</span>
                    <Badge variant="default" className="capitalize text-[10px] ml-auto">{e.platformId}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Errors */}
          {summary.errors.length > 0 && (
            <Card className="border-red-900/50">
              <CardHeader>
                <CardTitle className="text-base text-red-400">Errors Needing Attention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {summary.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm p-2 bg-red-500/10 rounded">
                    <Badge variant="error" className="text-[10px] capitalize">{err.platformId}</Badge>
                    <span className="text-red-300 text-xs">{err.error}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-zinc-400">No digest data for {date}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
