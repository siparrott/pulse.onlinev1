import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const eventType = searchParams.get('type');

  let query = supabase
    .from('publisher_governance_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ events: [], error: error.message }, { status: 200 });
  }

  return NextResponse.json({ events: data || [] });
}
