'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type InstagramAccount = {
  id: string
  name?: string
  username?: string
  profile_picture_url?: string
}

type MetaPage = {
  id: string
  name: string
  category: string
  picture: string | null
  pageAccessToken: string
  instagram: InstagramAccount | null
}

export default function MetaPagesPage() {
  const router = useRouter()
  const [pages, setPages] = useState<MetaPage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchPages() {
      try {
        const res = await fetch('/api/connect/meta/pages')
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load Pages')
          return
        }

        setPages(data.pages || [])
      } catch {
        setError('Network error — please try again')
      } finally {
        setLoading(false)
      }
    }

    fetchPages()
  }, [])

  async function selectPage(page: MetaPage) {
    setSaving(page.id)
    setError('')

    try {
      const res = await fetch('/api/connect/meta/pages/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.pageAccessToken,
          instagram: page.instagram,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save Page')
        setSaving(null)
        return
      }

      router.replace('/channels?success=meta_connected')
    } catch {
      setError('Network error — please try again')
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Select a Facebook Page</h1>
          <p className="mt-2 text-white/70">
            Choose a Page to connect. If it has a linked Instagram professional
            account, that will be connected automatically.
          </p>
        </div>
        <a
          href="/channels"
          className="rounded-lg border border-white/15 px-4 py-2 text-sm"
        >
          Cancel
        </a>
      </div>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/50">Loading your Pages…</p>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!loading && !pages.length && !error && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/60">
                No Facebook Pages found. Make sure you manage at least one Page
                and granted the right permissions.
              </p>
            </div>
          )}

          {pages.map((page) => (
            <div
              key={page.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center gap-4">
                {page.picture && (
                  <img
                    src={page.picture}
                    alt=""
                    className="h-12 w-12 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <p className="font-semibold">{page.name}</p>
                  <p className="text-sm text-white/50">{page.category}</p>
                  {page.instagram && (
                    <p className="mt-1 text-sm text-emerald-400">
                      IG linked: @{page.instagram.username || page.instagram.name}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => selectPage(page)}
                  disabled={saving !== null}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving === page.id ? 'Saving…' : 'Connect'}
                </button>
              </div>
            </div>
          ))}
    </div>
  )
}
