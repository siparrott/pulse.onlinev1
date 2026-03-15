import { NextRequest, NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { saveConnectedAccount } from '@/lib/workspaces/save-connected-account'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const { user, workspace } = await getUserWorkspace()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axixos.online'

  if (!user || !workspace) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const cookieStore = await cookies()
  const userToken = cookieStore.get('meta_user_token')?.value

  if (!userToken) {
    return NextResponse.json(
      { error: 'No Meta token found. Please reconnect.' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { pageId, pageName, pageAccessToken, instagram } = body as {
    pageId: string
    pageName: string
    pageAccessToken: string
    instagram?: {
      id: string
      name?: string
      username?: string
      profile_picture_url?: string
    } | null
  }

  if (!pageId || !pageAccessToken) {
    return NextResponse.json({ error: 'Missing page data' }, { status: 400 })
  }

  // Save the Facebook Page as a connected account
  await saveConnectedAccount({
    workspaceId: workspace.id,
    userId: user.id,
    provider: 'facebook',
    providerUserId: pageId,
    accountName: pageName || 'Facebook Page',
    accountType: 'page',
    accessToken: pageAccessToken,
    refreshToken: null,
    expiresAt: null, // Page tokens from long-lived user tokens don't expire
    scope: 'pages_show_list,business_management,pages_read_engagement',
    tokenType: 'Bearer',
    metadata: { source: 'meta_oauth', userToken: undefined },
  })

  // If there's a linked Instagram account, save it too
  if (instagram?.id) {
    await saveConnectedAccount({
      workspaceId: workspace.id,
      userId: user.id,
      provider: 'instagram',
      providerUserId: instagram.id,
      accountName: instagram.username || instagram.name || 'Instagram Account',
      accountType: 'business',
      accessToken: pageAccessToken, // IG API uses the Page token
      refreshToken: null,
      expiresAt: null,
      scope: 'instagram_business_account',
      tokenType: 'Bearer',
      metadata: {
        linkedPageId: pageId,
        username: instagram.username ?? null,
        profilePicture: instagram.profile_picture_url ?? null,
      },
    })
  }

  // Clear the temporary token cookie
  cookieStore.delete('meta_user_token')

  return NextResponse.json({ success: true })
}
