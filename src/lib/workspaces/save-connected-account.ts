import { createClient } from '@/lib/supabase/server'

type SaveConnectedAccountInput = {
  workspaceId: string
  userId: string
  provider: 'linkedin' | 'facebook' | 'instagram'
  providerUserId?: string | null
  accountName?: string | null
  accountType?: string | null
  accessToken?: string | null
  refreshToken?: string | null
  expiresAt?: string | null
  scope?: string | null
  tokenType?: string | null
  metadata?: Record<string, unknown>
}

export async function saveConnectedAccount(input: SaveConnectedAccountInput) {
  const supabase = await createClient()

  const { data: account, error: accountError } = await supabase
    .from('connected_accounts')
    .insert({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      provider: input.provider,
      provider_user_id: input.providerUserId,
      account_name: input.accountName,
      account_type: input.accountType,
      status: 'active',
      metadata: input.metadata ?? {},
    })
    .select()
    .single()

  if (accountError) {
    throw accountError
  }

  const { error: tokenError } = await supabase
    .from('oauth_tokens')
    .insert({
      connected_account_id: account.id,
      access_token: input.accessToken,
      refresh_token: input.refreshToken,
      expires_at: input.expiresAt,
      scope: input.scope,
      token_type: input.tokenType,
      metadata: input.metadata ?? {},
    })

  if (tokenError) {
    throw tokenError
  }

  return account
}
