import { createClient } from '@/lib/supabase/server'

export async function getUserWorkspace() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, workspace: null }

  const { data: workspaceMember, error } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspace:workspaces (
        id,
        name,
        slug,
        owner_user_id,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Workspace lookup error:', error)
    return { user, workspace: null }
  }

  return {
    user,
    workspace: workspaceMember?.workspace ?? null,
    role: workspaceMember?.role ?? null,
  }
}
