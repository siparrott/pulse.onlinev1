type MetaPage = {
  id: string
  name: string
  access_token?: string
  tasks?: string[]
  instagram_business_account?: {
    id: string
  } | null
}

export async function getUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const url = new URL('https://graph.facebook.com/v23.0/me/accounts')
  url.searchParams.set('fields', 'id,name,access_token,tasks,instagram_business_account')
  url.searchParams.set('access_token', userAccessToken)

  const res = await fetch(url.toString(), { method: 'GET' })
  const json = await res.json()

  if (!res.ok) {
    console.error('Meta pages error', json)
    throw new Error('Failed to fetch Meta Pages')
  }

  return json.data ?? []
}
