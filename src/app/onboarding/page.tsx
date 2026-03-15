import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export default async function OnboardingPage() {
  const { user, workspace } = await getUserWorkspace()

  if (!user) {
    redirect('/login')
  }

  // If they already have a workspace, skip onboarding
  if (workspace) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="text-lg font-semibold">AxixOS</p>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-white/15 px-4 py-2 text-sm">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
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
              No workspace found
            </p>
            <p className="mt-1 text-sm text-white/50">
              A workspace will be created for you automatically.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex rounded-lg border border-white/15 px-4 py-2 text-sm"
          >
            Go to dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
