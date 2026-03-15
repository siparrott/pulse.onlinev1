import Link from 'next/link'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export default async function OnboardingPage() {
  const { workspace } = await getUserWorkspace()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to AxixOS</h1>
        <p className="mt-2 text-white/70">
          Your workspace setup is now ready.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-white/50">Workspace</p>
        <p className="mt-2 text-xl font-semibold">
          {workspace?.name ?? 'No workspace found'}
        </p>
      </div>

      <Link
        href="/dashboard"
        className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm"
      >
        Go to dashboard
      </Link>
    </div>
  )
}
