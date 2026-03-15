import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-lg font-semibold">AxixOS</p>
            <p className="text-sm text-white/60">{user.email}</p>
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
