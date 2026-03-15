import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export default async function DashboardPage() {
  const { workspace, role } = await getUserWorkspace()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-white/70">
          Your governed publishing workspace is now active.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/50">Workspace</p>
          <p className="mt-2 text-xl font-semibold">{workspace?.name}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/50">Role</p>
          <p className="mt-2 text-xl font-semibold">{role}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/50">Connected channels</p>
          <p className="mt-2 text-xl font-semibold">0</p>
        </div>
      </div>
    </div>
  )
}
