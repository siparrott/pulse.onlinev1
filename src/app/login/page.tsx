'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Github } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // On mount, check if tokens are in the URL hash (implicit OAuth flow)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    const params = new URLSearchParams(hash.substring(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (!accessToken || !refreshToken) return

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setError(sessionError.message)
        } else {
          // Clear hash and redirect
          window.location.hash = ''
          router.push('/dashboard')
        }
      })
  }, [router])

  const handleOAuthLogin = (provider: 'github' | 'google') => {
    const redirectTo = `${window.location.origin}/login`
    const url = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`
    window.location.href = url
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
            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              onClick={() => handleOAuthLogin('google')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuthLogin('github')}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
            </button>
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
