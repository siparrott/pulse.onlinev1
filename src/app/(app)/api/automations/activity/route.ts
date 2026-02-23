/**
 * Phase 7: GET /api/automations/activity
 *
 * Returns automation action logs for the activity feed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ logs: [] });
  }

  const supabase = createServerClient();
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);

  const { data: logs, error } = await supabase
    .from('automation_action_logs')
    .select('*')
    .eq('user_id', 'default')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with rule names
  const enriched = [];
  const ruleNameCache = new Map<string, string>();

  for (const log of (logs ?? [])) {
    let ruleName = ruleNameCache.get(log.rule_id) ?? '';
    if (!ruleName) {
      const { data: rule } = await supabase
        .from('automation_rules')
        .select('name')
        .eq('id', log.rule_id)
        .single();
      ruleName = rule?.name ?? 'Unknown Rule';
      ruleNameCache.set(log.rule_id, ruleName);
    }
    enriched.push({ ...log, ruleName });
  }

  return NextResponse.json({ logs: enriched });
}
