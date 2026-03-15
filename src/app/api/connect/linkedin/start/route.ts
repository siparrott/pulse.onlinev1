import { NextResponse } from 'next/server'
import { getUserWorkspace } from '@/lib/workspaces/get-user-workspace'

export async function GET() {
  const { user, workspace } = await getUserWorkspace()

  if (!user || !workspace) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL))
  }

  const state = `${workspace.id}:${user.id}:${crypto.randomUUID()}`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    state,
    scope: 'openid profile email',
  })

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  )
}
