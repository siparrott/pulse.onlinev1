import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import type { PublisherChannel } from '@/lib/types/database';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('publisher_channels')
      .select('*')
      .is('archived_at', null)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ channels: data });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('publisher_channels')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ channel: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating channel:', error);
    return NextResponse.json(
      { error: 'Failed to create channel' },
      { status: 500 }
    );
  }
}
