import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAuth } from '@/lib/auth-helpers'
import { handleCors } from '@/lib/cors'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
]

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    // Verificar se usuário está autenticado
    const { userId } = await requireAuth()

    // Gerar URL de autorização do Google
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Para obter refresh token
      scope: SCOPES,
      prompt: 'consent', // Força mostrar tela de consentimento
      state: userId, // Passar userId no state para identificar no callback
    })

    return NextResponse.json({ authUrl }, { headers: handleCors(request) })
  } catch (error) {
    console.error('Erro ao gerar URL de autenticação:', error)
    return NextResponse.json(
      { error: 'Falha ao iniciar autenticação com Google Drive' },
      { status: 500, headers: handleCors(request) }
    )
  }
}
