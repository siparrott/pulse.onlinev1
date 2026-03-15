import { NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'
import { cookies } from 'next/headers'

export async function GET() {
  const { user, workspace } = await getUserWorkspace()

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

  // Fetch Pages the user can manage
  const pagesRes = await fetch(
    `https://graph.facebook.com/v22.0/me/accounts?` +
      new URLSearchParams({
        access_token: userToken,
        fields: 'id,name,access_token,category,picture{url}',
      })
  )

  const pagesJson = await pagesRes.json()

  if (!pagesRes.ok || pagesJson.error) {
    console.error('Meta Pages fetch error:', pagesJson)
    return NextResponse.json(
      { error: pagesJson.error?.message || 'Failed to fetch Pages' },
      { status: 502 }
    )
  }

  // For each Page, check if it has a linked Instagram account
  const pages = await Promise.all(
    (pagesJson.data || []).map(async (page: {
      id: string
      name: string
      access_token: string
      category: string
      picture?: { data?: { url?: string } }
    }) => {
      let instagram = null

      try {
        const igRes = await fetch(
          `https://graph.facebook.com/v22.0/${page.id}?` +
            new URLSearchParams({
              access_token: page.access_token,
              fields: 'instagram_business_account{id,name,username,profile_picture_url}',
            })
        )

        const igJson = await igRes.json()
        if (igJson.instagram_business_account) {
          instagram = igJson.instagram_business_account
        }
      } catch (err) {
        console.error(`Failed to fetch IG for page ${page.id}:`, err)
      }

      return {
        id: page.id,
        name: page.name,
        category: page.category,
        picture: page.picture?.data?.url ?? null,
        pageAccessToken: page.access_token,
        instagram,
      }
    })
  )

  return NextResponse.json({ pages })
}
