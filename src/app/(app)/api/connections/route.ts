/**
 * Phase 5: GET /api/connections — List all platform connections
 * Phase 5: POST /api/connections — "Bring your token" dev connector
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { encryptToken } from '@/lib/platforms/tokens';

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ connections: [] });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('user_platform_connections')
      .select('id, user_id, platform_id, account_label, external_account_id, token_expires_at, scopes, meta, status, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // NEVER return tokens to the client
    return NextResponse.json({ connections: data ?? [] });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}

/**
 * POST /api/connections — Create a connection ("bring your token" dev mode)
 *
 * Body: { platformId, accountLabel, accessToken, refreshToken?, externalAccountId?, scopes?, meta? }
 */
export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { platformId, accountLabel, accessToken, refreshToken, externalAccountId, scopes, meta } = body;

    if (!platformId || !accountLabel) {
      return NextResponse.json(
        { error: 'platformId and accountLabel are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const row = {
      user_id: 'default',
      platform_id: platformId,
      account_label: accountLabel,
      external_account_id: externalAccountId || '',
      access_token_encrypted: accessToken ? encryptToken(accessToken) : '',
      refresh_token_encrypted: refreshToken ? encryptToken(refreshToken) : null,
      token_expires_at: null,
      scopes: scopes || [],
      meta: meta || {},
      status: 'connected',
    };

    const { data, error } = await supabase
      .from('user_platform_connections')
      .insert(row)
      .select('id, user_id, platform_id, account_label, external_account_id, token_expires_at, scopes, meta, status, created_at, updated_at')
      .single();

    if (error) throw error;

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating connection:', error);
    return NextResponse.json({ error: 'Failed to create connection' }, { status: 500 });
  }
}
