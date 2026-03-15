import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/composer',
  '/calendar',
  '/channels',
  '/queue',
  '/imports',
  '/assets',
  '/publishing',
  '/automations',
  '/analytics',
  '/digests',
  '/settings',
  '/workspace',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip Supabase entirely for public/marketing routes
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isLoginPage = pathname === '/login'

  if (!isProtected && !isLoginPage) {
    return NextResponse.next()
  }

  // Guard against missing env vars (prevents Edge Runtime crash)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes - redirect to login if not authenticated
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login page
  if (user && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/composer/:path*',
    '/calendar/:path*',
    '/channels/:path*',
    '/queue/:path*',
    '/imports/:path*',
    '/assets/:path*',
    '/publishing/:path*',
    '/automations/:path*',
    '/analytics/:path*',
    '/digests/:path*',
    '/settings/:path*',
    '/workspace/:path*',
    '/login',
  ],
}
