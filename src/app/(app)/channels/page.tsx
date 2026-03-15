import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export default async function ChannelsPage() {
  const { workspace } = await getUserWorkspace()
  const supabase = await createClient()

  const { data: channels } = await supabase
    .from('connected_accounts')
    .select('id, provider, account_name, account_type, status, created_at')
    .eq('workspace_id', workspace!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Connected Channels</h1>
        <p className="mt-2 text-white/70">
          Manage connected publishing accounts for {workspace?.name}.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/api/connect/linkedin/start"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Connect LinkedIn
        </Link>

        <Link
          href="/api/connect/meta/start"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Connect Facebook / Instagram
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-4 text-sm text-white/50">Connected accounts</p>

        {!channels?.length ? (
          <p className="text-sm text-white/60">No channels connected yet.</p>
        ) : (
          <div className="space-y-3">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="rounded-xl border border-white/10 px-4 py-3"
              >
                <p className="font-medium">
                  {channel.account_name || channel.provider}
                </p>
                <p className="text-sm text-white/60">
                  {channel.provider} · {channel.account_type || 'account'} · {channel.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
