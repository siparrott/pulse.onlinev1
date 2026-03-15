import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=callback_exchange_failed`)
    }

    // Check if this is a brand-new user (created within the last 10 seconds)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const createdAt = new Date(user.created_at).getTime()
      const now = Date.now()
      if (now - createdAt < 10_000) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }
    }
  } else {
    console.error('No code param in callback')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
