import { NextResponse } from 'next/server'

export async function GET() {
  // Meta (Facebook/Instagram) OAuth is not yet configured.
  // Redirect back to channels with a message.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://axixos.online'
  return NextResponse.redirect(
    `${siteUrl}/channels?error=meta_not_configured`
  )
}
