import { redirect } from 'next/navigation'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, workspace, role } = await getUserWorkspace()

  if (!user) {
    redirect('/login')
  }

  if (!workspace) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-lg font-semibold">AxixOS</p>
            <p className="text-sm text-white/60">
              {workspace.name} · {role}
            </p>
            <p className="text-xs text-white/40">{user.email}</p>
          </div>

          <div className="flex gap-4 text-sm text-white/70">
            <a href="/dashboard" className="hover:text-white">Dashboard</a>
            <a href="/channels" className="hover:text-white">Channels</a>
          </div>

          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-white/15 px-4 py-2 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </div>
  )
}
