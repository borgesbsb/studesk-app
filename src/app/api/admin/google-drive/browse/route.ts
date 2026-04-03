import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = await prisma.admin.findUnique({
    where: { id: session.id },
    select: { googleDriveAccessToken: true, googleDriveRefreshToken: true },
  })

  if (!admin?.googleDriveAccessToken) {
    return NextResponse.json({ error: 'Drive não conectado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId') || 'root'

  const ADMIN_REDIRECT_URI = process.env.GOOGLE_ADMIN_REDIRECT_URI
    || `${process.env.NEXTAUTH_URL || 'http://localhost:3030'}/api/admin/google-drive/callback`

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_REDIRECT_URI
  )
  oauth2Client.setCredentials({
    access_token:  admin.googleDriveAccessToken,
    refresh_token: admin.googleDriveRefreshToken || undefined,
  })

  // Se o token for renovado, salva no banco
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.admin.update({
        where: { id: session.id },
        data: {
          googleDriveAccessToken:  tokens.access_token,
          googleDriveRefreshToken: tokens.refresh_token || undefined,
        },
      })
    }
  })

  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  try {
    const query = `'${folderId}' in parents and trashed=false`

    const res = await drive.files.list({
      q: query,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      orderBy: 'folder,name',
      pageSize: 500,
    })

    const files = (res.data.files || []).map(f => ({
      id:           f.id!,
      name:         f.name!,
      mimeType:     f.mimeType!,
      size:         f.size || null,
      modifiedTime: f.modifiedTime || null,
      isFolder:     f.mimeType === 'application/vnd.google-apps.folder',
    }))

    return NextResponse.json({ files })
  } catch (err: any) {
    console.error('[admin/drive/browse]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
