import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'LinkedIn OAuth not configured' },
      { status: 500 }
    )
  }

  const state = randomBytes(16).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const scopes = ['openid', 'profile', 'email']

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes.join(' '),
  })

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`

  return NextResponse.redirect(authUrl)
}
