'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Loader2, Clock, Zap, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Approval {
  id: string;
  action_log_id: string;
  status: string;
  created_at: string;
  actionLog: {
    id: string;
    action_type: string;
    platform_id: string;
    payload: Record<string, unknown>;
    reason: string;
  } | null;
  ruleName: string;
  postTitle: string;
  publishedAt: string;
}

export default function AutomationsApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/approvals');
      const data = await res.json();
      setApprovals(data.approvals ?? []);
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    fetchApprovals().finally(() => setLoading(false));
  }, [fetchApprovals]);

  const handleDecision = async (approvalId: string, decision: 'approved' | 'rejected') => {
    setActing(approvalId);
    try {
      await fetch('/api/automations/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId, decision }),
      });
      await fetchApprovals();
    } finally {
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Clock className="h-6 w-6 text-amber-500" />
          Pending Approvals
        </h1>
        <p className="text-zinc-400 mt-1">
          Review and approve or reject automation actions before they execute.
        </p>
      </div>

      {approvals.length === 0 ? (
        <Card className="border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-500">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No pending approvals.</p>
            <p className="text-sm mt-1">Actions that require approval will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => {
            const payload = approval.actionLog?.payload ?? {};
            const actionType = approval.actionLog?.action_type ?? 'unknown';
            return (
              <Card key={approval.id} className="border-zinc-800 border-l-2 border-l-amber-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base text-white">
                        {approval.ruleName || 'Automation Rule'}
                      </CardTitle>
                      <p className="text-xs text-zinc-400 mt-1">
                        {approval.postTitle || 'Unknown Post'} • {approval.actionLog?.platform_id || 'facebook'}
                        {approval.publishedAt && (
                          <> • Published {new Date(approval.publishedAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Proposed action */}
                  <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-medium text-white">
                        {actionType.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {actionType === 'schedule_repost' && (
                      <div className="text-xs text-zinc-400 space-y-1">
                        <p>Schedule time: +{String(payload.delayHours ?? 24)}h from now</p>
                        {payload.captionAppend ? (
                          <p>Caption append: &ldquo;{String(payload.captionAppend)}&rdquo;</p>
                        ) : null}
                        {payload.originalCaption ? (
                          <div className="mt-2 p-2 bg-zinc-900 rounded text-zinc-300">
                            <p className="text-zinc-500 mb-1">Caption preview:</p>
                            {String(payload.originalCaption)}
                            {payload.captionAppend ? (
                              <span className="text-emerald-400">{'\n\n'}{String(payload.captionAppend)}</span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                    {actionType === 'notify' && (
                      <p className="text-xs text-zinc-300">{String(payload.message ?? '')}</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-1">
                      Reason: {approval.actionLog?.reason ?? '—'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDecision(approval.id, 'approved')}
                      disabled={acting === approval.id}
                      size="sm"
                      className="gap-1"
                    >
                      {acting === approval.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleDecision(approval.id, 'rejected')}
                      disabled={acting === approval.id}
                      size="sm"
                      className="gap-1 text-red-400 hover:text-red-300"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
