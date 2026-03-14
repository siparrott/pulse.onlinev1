import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('exchangeCodeForSession error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=callback_exchange_failed`)
    }
  } else {
    console.error('No code param in callback')
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
