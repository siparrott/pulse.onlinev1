import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const { data, error } = await supabase
      .from('publisher_channels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ channel: data });
  } catch (error) {
    console.error('Error fetching channel:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('publisher_channels')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ channel: data });
  } catch (error) {
    console.error('Error updating channel:', error);
    return NextResponse.json(
      { error: 'Failed to update channel' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    // Soft delete - set archived_at
    const { error } = await supabase
      .from('publisher_channels')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving channel:', error);
    return NextResponse.json(
      { error: 'Failed to archive channel' },
      { status: 500 }
    );
  }
}
