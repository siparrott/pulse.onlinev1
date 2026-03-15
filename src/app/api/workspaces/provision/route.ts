import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if user already has a workspace
  const { data: existing } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Workspace already exists' }, { status: 409 })
  }

  // Create workspace
  const name = user.user_metadata?.full_name
    ? `${user.user_metadata.full_name}'s Workspace`
    : 'My Workspace'

  const slug = `ws-${user.id.slice(0, 8)}`

  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({
      name,
      slug,
      owner_user_id: user.id,
    })
    .select()
    .single()

  if (wsError) {
    console.error('Failed to create workspace:', wsError)
    return NextResponse.json({ error: wsError.message }, { status: 500 })
  }

  // Add user as owner
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

  if (memberError) {
    console.error('Failed to add workspace member:', memberError)
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ workspace })
}
