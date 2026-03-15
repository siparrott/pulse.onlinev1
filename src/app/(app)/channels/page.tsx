import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChannelsClient } from './channels-client';

export default async function ChannelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <ChannelsClient />;
}
