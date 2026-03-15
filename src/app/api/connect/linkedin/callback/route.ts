import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axixos.online'

  if (error) {
    console.error('LinkedIn OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Missing code or state')}`
    )
  }

  // Verify state
  const cookieStore = await cookies()
  const savedState = cookieStore.get('linkedin_oauth_state')?.value

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Invalid OAuth state')}`
    )
  }

  // Clear state cookie
  cookieStore.delete('linkedin_oauth_state')

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI!

  // Exchange code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    const tokenError = await tokenRes.text()
    console.error('LinkedIn token exchange failed:', tokenError)
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Token exchange failed')}`
    )
  }

  const tokenData = await tokenRes.json()
  const accessToken = tokenData.access_token
  const expiresIn = tokenData.expires_in

  // Fetch LinkedIn profile using userinfo endpoint (OpenID Connect)
  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!profileRes.ok) {
    const profileError = await profileRes.text()
    console.error('LinkedIn profile fetch failed:', profileError)
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Profile fetch failed')}`
    )
  }

  const profile = await profileRes.json()

  // Get current AxixOS user and workspace
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${baseUrl}/login`)
  }

  const { data: workspaceMember } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!workspaceMember) {
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('No workspace found')}`
    )
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  // Save connected account
  const { data: account, error: accountError } = await supabase
    .from('connected_accounts')
    .insert({
      workspace_id: workspaceMember.workspace_id,
      user_id: user.id,
      provider: 'linkedin',
      provider_user_id: profile.sub,
      account_name: profile.name || `${profile.given_name} ${profile.family_name}`,
      account_type: 'member',
      status: 'active',
      metadata: {
        email: profile.email,
        picture: profile.picture,
      },
    })
    .select()
    .single()

  if (accountError) {
    console.error('Failed to save connected account:', accountError)
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Failed to save account: ' + accountError.message)}`
    )
  }

  // Save OAuth token
  const { error: tokenSaveError } = await supabase
    .from('oauth_tokens')
    .insert({
      connected_account_id: account.id,
      access_token: accessToken,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      scope: tokenData.scope || 'openid profile email',
      token_type: tokenData.token_type || 'Bearer',
      metadata: {},
    })

  if (tokenSaveError) {
    console.error('Failed to save OAuth token:', tokenSaveError)
    // Account was saved, token save failed — still redirect but with warning
    return NextResponse.redirect(
      `${baseUrl}/channels?error=${encodeURIComponent('Account saved but token save failed')}`
    )
  }

  return NextResponse.redirect(`${baseUrl}/channels`)
}
