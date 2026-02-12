import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channel_id');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('publisher_posts')
      .select('*, channel:publisher_channels(name, product_code)')
      .order('date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (channelId) {
      query = query.eq('channel_id', channelId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ posts: data });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle bulk insert for CSV import
    const posts = Array.isArray(body) ? body : [body];

    const { data, error } = await supabase
      .from('publisher_posts')
      .insert(posts)
      .select();

    if (error) throw error;

    return NextResponse.json({ posts: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating posts:', error);
    return NextResponse.json(
      { error: 'Failed to create posts' },
      { status: 500 }
    );
  }
}
