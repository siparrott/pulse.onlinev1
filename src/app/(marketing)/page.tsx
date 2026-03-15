import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold">AxixOS</h1>
        <p className="mt-4 text-white/70">
          Governed publishing and connected identity for the AxixOS ecosystem.
        </p>

        <div className="mt-8">
          {user ? (
            <Link href="/dashboard" className="rounded-lg border px-4 py-3">
              Go to dashboard
            </Link>
          ) : (
            <Link href="/login" className="rounded-lg border px-4 py-3">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
