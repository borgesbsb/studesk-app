import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminSession } from '@/interface/actions/admin/auth'

const ADMIN_REDIRECT_URI = process.env.GOOGLE_ADMIN_REDIRECT_URI
  || `${process.env.NEXTAUTH_URL || 'http://localhost:3030'}/api/admin/google-drive/callback`

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  ADMIN_REDIRECT_URI
)

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.readonly'],
    prompt: 'consent',
    state: session.id,
  })

  return NextResponse.json({ authUrl })
}
