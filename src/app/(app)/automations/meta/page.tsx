'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Power, PowerOff, Trash2, Loader2, Shield,
  Clock, Hash, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Rule {
  id: string;
  name: string;
  is_enabled: boolean;
  platform_id: string;
  scope: string;
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; [k: string]: unknown }>;
  constraints: Record<string, unknown>;
  requires_approval: boolean;
  created_at: string;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  platformId: string;
  conditions: Record<string, unknown>;
  actions: Array<{ type: string; [k: string]: unknown }>;
  constraints: Record<string, unknown>;
  requiresApproval: boolean;
}

export default function AutomationsMetaPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPresets, setShowPresets] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testingRule, setTestingRule] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/rules');
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch { /* empty */ }
  }, []);

  const fetchPresets = useCallback(async () => {
    try {
      const res = await fetch('/api/automations/presets');
      const data = await res.json();
      setPresets(data.presets ?? []);
    } catch { /* empty */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchRules(), fetchPresets()]).finally(() => setLoading(false));
  }, [fetchRules, fetchPresets]);

  const createFromPreset = async (presetId: string) => {
    setCreating(presetId);
    try {
      const res = await fetch('/api/automations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset_id: presetId, is_enabled: false }),
      });
      if (res.ok) {
        await fetchRules();
        setShowPresets(false);
      }
    } finally {
      setCreating(null);
    }
  };

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await fetch(`/api/automations/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: enabled }),
    });
    await fetchRules();
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Delete this automation rule?')) return;
    await fetch(`/api/automations/rules/${ruleId}`, { method: 'DELETE' });
    await fetchRules();
  };

  const testRule = async (ruleId: string) => {
    setTestingRule(ruleId);
    setTestResult(null);
    try {
      // Dry-run: just show what the evaluate endpoint would see for this rule
      // We call the activity endpoint filtered for this rule to show latest
      const res = await fetch(`/api/automations/activity?limit=10`);
      const data = await res.json();
      const ruleActivity = (data.logs ?? []).filter((l: Record<string, unknown>) => l.rule_id === ruleId);
      setTestResult({
        message: ruleActivity.length > 0
          ? `Found ${ruleActivity.length} recent actions for this rule`
          : 'No recent actions. Rule will evaluate on next cron run.',
        recentActions: ruleActivity.slice(0, 3),
      });
    } finally {
      setTestingRule(null);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-emerald-500" />
            Meta Automations
          </h1>
          <p className="text-zinc-400 mt-1">
            Facebook Page automation rules — reposts, alerts, and more.
          </p>
        </div>
        <Button onClick={() => setShowPresets(!showPresets)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Kill switch warning */}
      {typeof window !== 'undefined' && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 flex items-center gap-2 text-amber-400 text-sm">
            <Shield className="h-4 w-4 shrink-0" />
            All automations are governed by safety rails: daily caps, cooldowns, quiet hours, and kill switch.
          </CardContent>
        </Card>
      )}

      {/* Preset selector */}
      {showPresets && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} className="border-zinc-700 hover:border-emerald-500/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white">{preset.name}</CardTitle>
                <CardDescription className="text-xs">{preset.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1 text-xs text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Window: {(preset.conditions as Record<string, Record<string, number>>).window?.hoursSincePublishMin}–
                    {(preset.conditions as Record<string, Record<string, number>>).window?.hoursSincePublishMax}h
                  </div>
                  <div className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {preset.actions.map((a) => a.type).join(', ')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    {preset.requiresApproval ? 'Requires approval' : 'Auto-execute'}
                  </div>
                </div>
                <Button
                  onClick={() => createFromPreset(preset.id)}
                  disabled={creating === preset.id}
                  size="sm"
                  className="w-full"
                >
                  {creating === preset.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Rule'
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rules list */}
      {rules.length === 0 ? (
        <Card className="border-zinc-800">
          <CardContent className="py-12 text-center text-zinc-500">
            <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No automation rules yet.</p>
            <p className="text-sm mt-1">Click &quot;New Rule&quot; to get started with a preset.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => {
            const actions = rule.actions || [];
            const constraints = rule.constraints as Record<string, unknown>;
            return (
              <Card key={rule.id} className={`border-zinc-800 ${rule.is_enabled ? 'border-l-emerald-500 border-l-2' : ''}`}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-white truncate">{rule.name}</h3>
                        <Badge variant={rule.is_enabled ? 'success' : 'default'}>
                          {rule.is_enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {rule.requires_approval && (
                          <Badge variant="warning">Approval Required</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-zinc-400 mt-2">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {actions.map((a) => a.type.replace(/_/g, ' ')).join(', ')}
                        </span>
                        {constraints.maxActionsPerDay != null && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Max {String(constraints.maxActionsPerDay)}/day
                          </span>
                        )}
                        {constraints.cooldownHoursPerPost != null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {String(constraints.cooldownHoursPerPost)}h cooldown
                          </span>
                        )}
                        <span className="text-zinc-600">
                          Created {new Date(rule.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testRule(rule.id)}
                        disabled={testingRule === rule.id}
                        title="Test rule"
                      >
                        {testingRule === rule.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRule(rule.id, !rule.is_enabled)}
                        title={rule.is_enabled ? 'Disable' : 'Enable'}
                      >
                        {rule.is_enabled ? (
                          <Power className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <PowerOff className="h-4 w-4 text-zinc-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRule(rule.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>

                  {/* Test result inline */}
                  {testResult && testingRule === null && (
                    <div className="mt-3 p-2 bg-zinc-800/50 rounded text-xs text-zinc-300">
                      {(testResult as Record<string, unknown>).message as string}
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
