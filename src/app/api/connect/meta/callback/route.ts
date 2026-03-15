import { NextRequest, NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { user, workspace } = await getUserWorkspace()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axixos.online'

  if (!user || !workspace) {
    return NextResponse.redirect(new URL('/login', siteUrl))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    console.error('Meta OAuth error:', error)
    return NextResponse.redirect(
      new URL('/channels?error=meta_auth_failed', siteUrl)
    )
  }

  // Exchange code for user access token
  const tokenRes = await fetch(
    `https://graph.facebook.com/v22.0/oauth/access_token?` +
      new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        redirect_uri: process.env.META_REDIRECT_URI!,
        code,
      }),
    { method: 'GET' }
  )

  const tokenJson = await tokenRes.json()

  if (!tokenRes.ok || tokenJson.error) {
    console.error('Meta token exchange error:', tokenJson)
    return NextResponse.redirect(
      new URL('/channels?error=meta_token_failed', siteUrl)
    )
  }

  // Store the user token in a secure httpOnly cookie for the page-picker step
  const cookieStore = await cookies()
  cookieStore.set('meta_user_token', tokenJson.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600, // 10 minutes — enough to pick pages
    path: '/',
  })

  // Redirect to Page picker UI
  return NextResponse.redirect(
    new URL('/channels/meta-pages', siteUrl)
  )
}
