import { NextResponse } from 'next/server'

function mask(val: string | undefined): string {
  if (!val) return '(not set)'
  if (val.length <= 20) return `${val.slice(0, 4)}...${val.slice(-4)} (len=${val.length})`
  return `${val.slice(0, 10)}...${val.slice(-10)} (len=${val.length})`
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Test the key against Supabase auth settings endpoint
  let apiTestStatus = 'not tested'
  let apiTestBody = ''
  if (url && anonKey) {
    try {
      const res = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: anonKey },
      })
      apiTestStatus = `${res.status} ${res.statusText}`
      if (!res.ok) {
        apiTestBody = await res.text()
      } else {
        apiTestBody = 'OK'
      }
    } catch (e) {
      apiTestStatus = 'fetch error'
      apiTestBody = e instanceof Error ? e.message : String(e)
    }
  }

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: mask(url),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
      SUPABASE_SERVICE_ROLE_KEY: mask(serviceKey),
    },
    supabaseApiTest: {
      status: apiTestStatus,
      body: apiTestBody,
    },
    timestamp: new Date().toISOString(),
  })
}
