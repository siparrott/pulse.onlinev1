import { redirect } from 'next/navigation'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { Navigation } from '@/components/navigation'

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
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <Navigation userEmail={user.email} />
      <main className="flex-1 pl-64">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
