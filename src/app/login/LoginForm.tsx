'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Show callback errors from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      setMessage(decodeURIComponent(err))
    }
  }, [])

  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined

  async function handleEmailAuth(mode: 'signin' | 'signup') {
    console.log(`Email auth clicked: ${mode}`)

    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
          },
        })

        if (error) throw error

        setMessage('Account created. You can now sign in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        window.location.href = '/dashboard'
        return
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      console.error('Email auth error:', err)
      setMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'facebook') {
    console.log(`OAuth clicked: ${provider}`)

    if (loading) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      })

      if (error) throw error
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'OAuth failed'
      console.error('OAuth error:', err)
      setMessage(msg)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 shadow-xl">
        <div className="mx-auto mb-6 h-10 w-10 rounded-xl bg-emerald-900/60" />

        <h1 className="text-center text-3xl font-bold">Login to AxixOS</h1>
        <p className="mt-3 text-center text-sm text-white/70">
          Sign in to access your governed publishing system
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuth('facebook')}
            disabled={loading}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue with Facebook
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-white/40">
          <div className="h-px flex-1 bg-white/10" />
          <span>or sign in with email</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-emerald-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-emerald-500"
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleEmailAuth('signin')}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => handleEmailAuth('signup')}
              disabled={loading}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Sign up'}
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {message}
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-white/50">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  )
}
