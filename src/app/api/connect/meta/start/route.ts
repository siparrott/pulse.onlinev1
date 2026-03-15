import { NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export async function GET() {
  const { user, workspace } = await getUserWorkspace()

  if (!user || !workspace) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  }

  const state = `${workspace.id}:${user.id}:${crypto.randomUUID()}`

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    state,
    scope: 'pages_show_list,business_management,pages_read_engagement',
    response_type: 'code',
  })

  return NextResponse.redirect(
    `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`
  )
}
