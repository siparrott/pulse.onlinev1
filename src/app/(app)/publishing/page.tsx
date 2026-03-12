'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, RefreshCw, CheckCircle, XCircle, AlertTriangle, Loader2, Send, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Delivery {
  id: string;
  platform_id: string;
  connection_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  platform_post_id: string | null;
  published_at: string | null;
  caption: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface Schedule {
  id: string;
  post_id: string;
  scheduled_for: string;
  timezone: string;
  status: string;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  post?: { id: string; title: string; channel_id: string; status: string } | null;
  deliveries?: Delivery[];
}

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'default',
  scheduled: 'info',
  publishing: 'warning',
  published: 'success',
  partially_published: 'warning',
  failed: 'error',
  cancelled: 'default',
  queued: 'info',
  skipped: 'default',
};

export default function PublishingDashboard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules');
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const handleCancel = async (scheduleId: string) => {
    try {
      const res = await fetch(`/api/schedules/${scheduleId}/cancel`, { method: 'POST' });
      if (res.ok) {
        loadSchedules();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel schedule');
      }
    } catch {
      alert('Failed to cancel schedule');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'publishing':
        return <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />;
      case 'scheduled':
      case 'queued':
        return <Clock className="h-4 w-4 text-blue-400" />;
      case 'partially_published':
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-zinc-500" />;
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  // Group: upcoming, in-progress, completed
  const upcoming = schedules.filter((s) => ['draft', 'scheduled'].includes(s.status));
  const inProgress = schedules.filter((s) => ['publishing'].includes(s.status));
  const completed = schedules.filter((s) =>
    ['published', 'partially_published', 'failed', 'cancelled'].includes(s.status)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Publishing</h1>
          <p className="text-zinc-400 text-sm">
            Scheduled posts, delivery statuses, and publishing logs
          </p>
        </div>
        <Button variant="secondary" onClick={loadSchedules} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading && schedules.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Send className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">No scheduled posts yet</p>
            <p className="text-zinc-600 text-sm">
              Schedule a post from the Composer to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                Upcoming ({upcoming.length})
              </h2>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    onCancel={() => handleCancel(s.id)}
                    getStatusIcon={getStatusIcon}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
                In Progress ({inProgress.length})
              </h2>
              <div className="space-y-3">
                {inProgress.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    getStatusIcon={getStatusIcon}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
                Completed ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map((s) => (
                  <ScheduleRow
                    key={s.id}
                    schedule={s}
                    expanded={expandedId === s.id}
                    onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    getStatusIcon={getStatusIcon}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Schedule Row Component ──────────────────────────────────

function ScheduleRow({
  schedule,
  expanded,
  onToggle,
  onCancel,
  getStatusIcon,
  formatDate,
}: {
  schedule: Schedule;
  expanded: boolean;
  onToggle: () => void;
  onCancel?: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
  formatDate: (iso: string) => string;
}) {
  const isDryRun = schedule.meta?.dryRun === true;
  const canCancel = ['draft', 'scheduled'].includes(schedule.status);

  return (
    <Card className={isDryRun ? 'border-dashed border-zinc-700' : ''}>
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={onToggle}
      >
        {getStatusIcon(schedule.status)}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">
              {schedule.post?.title || `Post ${schedule.post_id.slice(0, 8)}…`}
            </span>
            {isDryRun && (
              <Badge variant="default" className="text-[10px]">DRY-RUN</Badge>
            )}
          </div>
          <div className="text-xs text-zinc-500">
            {formatDate(schedule.scheduled_for)} · {schedule.timezone}
          </div>
        </div>
        <Badge variant={STATUS_BADGE[schedule.status] || 'default'}>
          {schedule.status.replace(/_/g, ' ')}
        </Badge>
        {schedule.deliveries && (
          <span className="text-xs text-zinc-500">
            {schedule.deliveries.filter((d) => d.status === 'published').length}/
            {schedule.deliveries.length} delivered
          </span>
        )}
        {canCancel && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
            className="text-red-400 hover:text-red-300 text-xs"
          >
            Cancel
          </Button>
        )}
        <Eye className="h-4 w-4 text-zinc-600" />
      </div>

      {/* Expanded: Delivery details */}
      {expanded && schedule.deliveries && (
        <div className="border-t border-zinc-800 px-4 py-3 space-y-2">
          <p className="text-xs font-medium text-zinc-400 mb-2">Platform Deliveries</p>
          {schedule.deliveries.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded"
            >
              {getStatusIcon(d.status)}
              <span className="text-xs text-zinc-300 capitalize w-20">
                {d.platform_id}
              </span>
              <Badge variant={STATUS_BADGE[d.status] || 'default'} className="text-[10px]">
                {d.status}
              </Badge>
              <span className="text-[10px] text-zinc-500">
                Attempts: {d.attempts}
              </span>
              {d.published_at && (
                <span className="text-[10px] text-emerald-400">
                  {formatDate(d.published_at)}
                </span>
              )}
              {d.platform_post_id && (
                <span className="text-[10px] text-zinc-500 font-mono truncate max-w-32">
                  ID: {d.platform_post_id}
                </span>
              )}
              {d.last_error && (
                <span className="text-[10px] text-red-400 truncate max-w-48" title={d.last_error}>
                  {d.last_error}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
