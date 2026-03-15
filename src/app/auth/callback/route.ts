import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    console.error('Auth callback: no code parameter in URL')
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('No authorization code received')}`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Auth callback: missing env vars', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
    })
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Server configuration error')}`)
  }

  // Log masked key for debugging
  console.log('Auth callback: using key', supabaseKey.slice(0, 10) + '...' + supabaseKey.slice(-10), 'len=' + supabaseKey.length)

  const cookieStore = await cookies()

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can throw in Server Components — safe to ignore here
          }
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback exchange error:', error.message, error.status)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
