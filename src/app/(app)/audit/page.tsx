'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Filter, RefreshCw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AuditEvent {
  id: string;
  channel_id: string | null;
  post_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  validation: { label: 'Validation', color: 'bg-emerald-500/20 text-emerald-400' },
  csv_import: { label: 'CSV Import', color: 'bg-blue-500/20 text-blue-400' },
  dry_run_publish: { label: 'Dry Run', color: 'bg-purple-500/20 text-purple-400' },
  publish: { label: 'Publish', color: 'bg-indigo-500/20 text-indigo-400' },
  variant_generate_start: { label: 'Variant Start', color: 'bg-amber-500/20 text-amber-400' },
  variant_generated: { label: 'Variant Generated', color: 'bg-emerald-500/20 text-emerald-400' },
  variant_governance: { label: 'Variant Governance', color: 'bg-cyan-500/20 text-cyan-400' },
  variant_generate_complete: { label: 'Variant Complete', color: 'bg-emerald-500/20 text-emerald-400' },
  ai_prompt_composed: { label: 'AI Prompt', color: 'bg-violet-500/20 text-violet-400' },
  ai_image_generated: { label: 'AI Image', color: 'bg-pink-500/20 text-pink-400' },
  ai_vision_check: { label: 'AI Vision Check', color: 'bg-rose-500/20 text-rose-400' },
};

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load audit events:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const uniqueTypes = Array.from(new Set(events.map(e => e.event_type))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ScrollText className="w-8 h-8 text-emerald-400" />
            Audit Log
          </h1>
          <p className="text-zinc-400 mt-1">Every governance, import, and publish event — with full payloads</p>
        </div>
        <Button onClick={loadEvents} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-64">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: '', label: 'All Event Types' },
              ...uniqueTypes.map(t => ({ value: t, label: EVENT_TYPE_LABELS[t]?.label || t })),
            ]}
          />
        </div>
        <div className="text-sm text-zinc-500 flex items-center">
          {events.length} events
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : events.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-12 text-center">
            <ScrollText className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No audit events yet</h3>
            <p className="text-zinc-400">Events will appear here as you validate posts, import CSVs, and run the publish pipeline.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map(event => {
            const isExpanded = expandedIds.has(event.id);
            const typeInfo = EVENT_TYPE_LABELS[event.event_type] || { label: event.event_type, color: 'bg-zinc-500/20 text-zinc-400' };
            const date = new Date(event.created_at);

            return (
              <Card key={event.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-0">
                  <button
                    onClick={() => toggleExpand(event.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        : <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      }
                      <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                      <span className="text-zinc-400 text-sm truncate">
                        {event.post_id ? `Post ${event.post_id.slice(0, 8)}…` : 'System event'}
                      </span>
                    </div>
                    <span className="text-zinc-500 text-xs flex-shrink-0 ml-4">
                      {date.toLocaleDateString()} {date.toLocaleTimeString()}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-zinc-500">Event Type</span>
                          <p className="text-white font-mono text-xs mt-1">{event.event_type}</p>
                        </div>
                        <div>
                          <span className="text-zinc-500">Timestamp</span>
                          <p className="text-white text-xs mt-1">{date.toISOString()}</p>
                        </div>
                        {event.channel_id && (
                          <div>
                            <span className="text-zinc-500">Channel ID</span>
                            <p className="text-white font-mono text-xs mt-1">{event.channel_id}</p>
                          </div>
                        )}
                        {event.post_id && (
                          <div>
                            <span className="text-zinc-500">Post ID</span>
                            <p className="text-white font-mono text-xs mt-1">{event.post_id}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-zinc-500 text-sm">Payload</span>
                        <pre className="mt-2 bg-zinc-950 border border-zinc-800 rounded p-3 text-xs text-zinc-300 overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
