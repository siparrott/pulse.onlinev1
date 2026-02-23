/**
 * Phase 7: PATCH /api/automations/rules/[id]
 *
 * Toggle enable/disable, update name, constraints, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const supabase = createServerClient();

  // Only allow updating safe fields
  const updates: Record<string, unknown> = {};
  if (typeof body.is_enabled === 'boolean') updates.is_enabled = body.is_enabled;
  if (typeof body.name === 'string') updates.name = body.name;
  if (body.constraints) updates.constraints = body.constraints;
  if (typeof body.requires_approval === 'boolean') updates.requires_approval = body.requires_approval;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from('automation_rules')
    .update(updates)
    .eq('id', id)
    .eq('user_id', 'default')
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const { id } = await context.params;
  const supabase = createServerClient();

  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', 'default');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
