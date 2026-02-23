'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Loader2, CheckCircle2, XCircle, Clock,
  AlertTriangle, Ban, Zap, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActionLog {
  id: string;
  rule_id: string;
  ruleName: string;
  post_delivery_id: string | null;
  post_schedule_id: string | null;
  platform_id: string;
  action_type: string;
  status: string;
  reason: string | null;
  payload: Record<string, unknown>;
  external_action_id: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default' }> = {
  done:      { icon: CheckCircle2, color: 'text-emerald-500', variant: 'success' },
  queued:    { icon: Clock,        color: 'text-blue-400',    variant: 'info' },
  approved:  { icon: CheckCircle2, color: 'text-blue-400',    variant: 'info' },
  executing: { icon: Zap,          color: 'text-amber-400',   variant: 'warning' },
  failed:    { icon: XCircle,      color: 'text-red-400',     variant: 'error' },
  skipped:   { icon: AlertTriangle,color: 'text-zinc-400',    variant: 'default' },
  blocked:   { icon: Ban,          color: 'text-red-400',     variant: 'error' },
};

export default function AutomationsActivityPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/activity?limit=100');
      const data = await res.json();
      setLogs(data.logs ?? []);
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    fetchLogs().finally(() => setLoading(false));
  }, [fetchLogs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  // Status summary
  const statusCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.status] = (acc[log.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-emerald-500" />
          Automation Activity
        </h1>
        <p className="text-zinc-400 mt-1">
          Full audit trail of all automation actions — created, blocked, executed, and failed.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(statusConfig).map(([status, cfg]) => (
          <Card key={status} className="border-zinc-800">
            <CardContent className="py-3 text-center">
              <cfg.icon className={`h-5 w-5 mx-auto ${cfg.color}`} />
              <div className="text-xl font-bold text-white mt-1">
                {statusCounts[status] ?? 0}
              </div>
              <div className="text-xs text-zinc-500 capitalize">{status}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity table */}
      {logs.length === 0 ? (
        <Card className="border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-500">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No automation activity yet.</p>
            <p className="text-sm mt-1">Actions will appear here after rules are evaluated.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Rule</th>
                <th className="py-2 px-3">Platform</th>
                <th className="py-2 px-3">Reason</th>
                <th className="py-2 px-3">Attempts</th>
                <th className="py-2 px-3">Created</th>
                <th className="py-2 px-3">Updated</th>
                <th className="py-2 px-3">Links</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const cfg = statusConfig[log.status] ?? statusConfig.queued;
                return (
                  <tr key={log.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                    <td className="py-2 px-3">
                      <Badge variant={cfg.variant}>
                        <cfg.icon className="h-3 w-3 mr-1" />
                        {log.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-white">
                      {log.action_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 px-3 text-zinc-300">
                      {log.ruleName}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="default">{log.platform_id}</Badge>
                    </td>
                    <td className="py-2 px-3 text-zinc-400 max-w-xs truncate" title={log.reason ?? ''}>
                      {log.reason || '—'}
                    </td>
                    <td className="py-2 px-3 text-zinc-400">
                      {log.attempts}
                    </td>
                    <td className="py-2 px-3 text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-zinc-500 text-xs whitespace-nowrap">
                      {log.updated_at && log.updated_at !== log.created_at
                        ? new Date(log.updated_at).toLocaleString()
                        : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {(log.external_action_id || log.post_schedule_id) ? (
                        <Link
                          href={`/publishing`}
                          className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1 text-xs"
                        >
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
