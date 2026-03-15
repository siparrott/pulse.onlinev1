import { NextRequest, NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { saveConnectedAccount } from '@/lib/workspaces/save-connected-account'

export async function GET(request: NextRequest) {
  const { user, workspace } = await getUserWorkspace()

  if (!user || !workspace) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  }

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/channels?error=linkedin_missing_code', process.env.NEXT_PUBLIC_SITE_URL)
    )
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  const tokenJson = await tokenRes.json()

  if (!tokenRes.ok) {
    console.error('LinkedIn token error', tokenJson)
    return NextResponse.redirect(
      new URL('/channels?error=linkedin_token_failed', process.env.NEXT_PUBLIC_SITE_URL)
    )
  }

  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
    },
  })

  const profileJson = await profileRes.json()

  if (!profileRes.ok) {
    console.error('LinkedIn profile error', profileJson)
    return NextResponse.redirect(
      new URL('/channels?error=linkedin_profile_failed', process.env.NEXT_PUBLIC_SITE_URL)
    )
  }

  await saveConnectedAccount({
    workspaceId: workspace.id,
    userId: user.id,
    provider: 'linkedin',
    providerUserId: profileJson.sub ?? null,
    accountName: profileJson.name ?? profileJson.email ?? 'LinkedIn Account',
    accountType: 'member',
    accessToken: tokenJson.access_token ?? null,
    refreshToken: tokenJson.refresh_token ?? null,
    expiresAt: tokenJson.expires_in
      ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
      : null,
    scope: tokenJson.scope ?? null,
    tokenType: tokenJson.token_type ?? null,
    metadata: profileJson,
  })

  return NextResponse.redirect(
    new URL('/channels?success=linkedin_connected', process.env.NEXT_PUBLIC_SITE_URL)
  )
}
