/**
 * Phase 5: POST /api/connections/:id/disconnect — Mark connection as revoked
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext
) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('user_platform_connections')
      .update({ status: 'revoked' })
      .eq('id', id)
      .select('id, platform_id, account_label, status, updated_at')
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Error disconnecting:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
