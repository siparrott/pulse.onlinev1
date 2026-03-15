'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    async function provision() {
      try {
        const res = await fetch('/api/workspaces/provision', { method: 'POST' })
        const data = await res.json()

        if (res.status === 409) {
          // Already has a workspace — go to dashboard
          router.replace('/dashboard')
          return
        }

        if (!res.ok) {
          setStatus('error')
          setError(data.error ?? 'Failed to create workspace')
          return
        }

        setStatus('done')
        // Brief pause so user sees success, then redirect
        setTimeout(() => router.replace('/dashboard'), 1200)
      } catch {
        setStatus('error')
        setError('Network error — please try again')
      }
    }

    provision()
  }, [router])

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
              Setting up your workspace…
            </p>
          </div>

          {status === 'loading' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">Creating your workspace…</p>
            </div>
          )}

          {status === 'done' && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <p className="text-sm text-emerald-400">Workspace created! Redirecting to dashboard…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => { setStatus('loading'); setError(''); window.location.reload() }}
                className="mt-3 rounded-lg border border-white/15 px-4 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
