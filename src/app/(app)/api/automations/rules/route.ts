/**
 * Phase 7: GET/POST /api/automations/rules
 *
 * GET  — list all automation rules for the user
 * POST — create a new rule (optionally from a preset)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { getPresetById } from '@/lib/automation/presets';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ rules: [] });
  }

  const supabase = createServerClient();
  const { data: rules, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('user_id', 'default')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rules: rules ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  // If preset_id is provided, use preset values as defaults
  let name = body.name;
  let platformId = body.platform_id ?? 'facebook';
  let conditions = body.conditions ?? {};
  let actions = body.actions ?? [];
  let constraints = body.constraints ?? {};
  let requiresApproval = body.requires_approval ?? true;
  const scope = body.scope ?? 'all_posts';

  if (body.preset_id) {
    const preset = getPresetById(body.preset_id);
    if (!preset) {
      return NextResponse.json({ error: `Unknown preset: ${body.preset_id}` }, { status: 400 });
    }
    name = name || preset.name;
    platformId = preset.platformId;
    conditions = preset.conditions;
    actions = preset.actions;
    constraints = { ...preset.constraints, ...body.constraints };
    requiresApproval = preset.requiresApproval;
  }

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from('automation_rules')
    .insert({
      user_id: 'default',
      name,
      is_enabled: body.is_enabled ?? false,
      platform_id: platformId,
      scope,
      scope_ref_id: body.scope_ref_id ?? null,
      conditions,
      actions,
      constraints,
      requires_approval: requiresApproval,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule }, { status: 201 });
}
