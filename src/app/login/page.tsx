'use client'

import { createClient } from '@/lib/supabase/client'
import { Github } from 'lucide-react'
import { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleGitHubLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Error logging in:', error.message)
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
          {/* Logo/Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30" />
            <h1 className="text-2xl font-bold text-zinc-100">Welcome to AxixOS</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to access your governed publishing system
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-750 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Github className="h-5 w-5" />
              {loading ? 'Connecting...' : 'Continue with GitHub'}
            </button>

            {/* Add more OAuth providers here */}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Marketing Link */}
        <p className="mt-6 text-center text-sm text-zinc-400">
          Learn more about AxixOS →{' '}
          <a href="/" className="text-emerald-400 hover:text-emerald-300">
            Marketing Site
          </a>
        </p>
      </div>
    </main>
  )
}
