import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'

const ADMIN_REDIRECT_URI = process.env.GOOGLE_ADMIN_REDIRECT_URI
  || `${process.env.NEXTAUTH_URL || 'http://localhost:3030'}/api/admin/google-drive/callback`

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  ADMIN_REDIRECT_URI
)

function htmlResponse(script: string) {
  return new NextResponse(
    `<html><body><script>${script} window.close()</script></body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state') // adminId
  const error = searchParams.get('error')

  if (error || !code || !state) {
    return htmlResponse(`window.opener?.postMessage({ type: 'ADMIN_DRIVE_ERROR', error: 'Acesso negado' }, '*');`)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens.access_token) throw new Error('Token não recebido')

    await prisma.admin.update({
      where: { id: state },
      data: {
        googleDriveAccessToken:  tokens.access_token,
        googleDriveRefreshToken: tokens.refresh_token || undefined,
      },
    })

    return htmlResponse(`window.opener?.postMessage({ type: 'ADMIN_DRIVE_SUCCESS' }, '*');`)
  } catch (err: any) {
    console.error('[admin/drive/callback]', err)
    return htmlResponse(`window.opener?.postMessage({ type: 'ADMIN_DRIVE_ERROR', error: '${err.message}' }, '*');`)
  }
}
