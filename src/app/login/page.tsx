'use client'

import { useRef, useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  function getSupabase() {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    return supabaseRef.current
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Show callback errors from query params
  useEffect(() => {
    const callbackError = searchParams.get('error')
    if (callbackError) {
      setError(`Callback error: ${callbackError}`)
    }
  }, [searchParams])

  function getRedirectUrl() {
    return `${window.location.origin}/auth/callback`
  }

  async function signInWithGoogle() {
    setLoading(true)
    setError(null)

    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getRedirectUrl(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function signInWithFacebook() {
    setLoading(true)
    setError(null)

    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: getRedirectUrl(),
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  async function signUpWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await getSupabase().auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-8">
          {/* Logo/Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30" />
            <h1 className="text-2xl font-bold text-zinc-100">Login to AxixOS</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Sign in to access your governed publishing system
            </p>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3 mb-8">
            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
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
              onClick={signInWithFacebook}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900/50 px-3 text-zinc-500">or sign in with email</span>
            </div>
          </div>

          {/* Email Form */}
          <form onSubmit={signInWithEmail} className="space-y-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                Sign in
              </button>

              <button
                type="button"
                onClick={signUpWithEmail}
                disabled={loading}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:opacity-50"
              >
                Sign up
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            By signing in, you agree to our{' '}
            <a href="/terms" className="text-emerald-400/80 hover:text-emerald-300">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="text-emerald-400/80 hover:text-emerald-300">Privacy Policy</a>
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
