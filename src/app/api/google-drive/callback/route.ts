import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // userId
    const error = searchParams.get('error')

    // Se usuário negou acesso
    if (error) {
      return new NextResponse(`
        <html>
          <head><title>Acesso Negado</title></head>
          <body>
            <script>
              window.opener.postMessage({
                type: 'GOOGLE_DRIVE_AUTH_ERROR',
                error: 'Acesso ao Google Drive foi negado'
              }, '*')
              window.close()
            </script>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html', ...handleCors(request) }
      })
    }

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Código de autorização ou ID de usuário não fornecido' },
        { status: 400, headers: handleCors(request) }
      )
    }

    const userId = state

    // Trocar código por tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      throw new Error('Access token não recebido')
    }

    // Salvar tokens no banco de dados
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleDriveAccessToken: tokens.access_token,
        googleDriveRefreshToken: tokens.refresh_token || null,
        googleDriveTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    })

    // Retornar sucesso e fechar popup
    return new NextResponse(`
      <html>
        <head><title>Conectado com Sucesso</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_DRIVE_AUTH_SUCCESS'
            }, '*')
            window.close()
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html', ...handleCors(request) }
    })
  } catch (error) {
    console.error('Erro no callback do Google Drive:', error)

    return new NextResponse(`
      <html>
        <head><title>Erro</title></head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_DRIVE_AUTH_ERROR',
              error: 'Erro ao conectar com Google Drive'
            }, '*')
            window.close()
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html', ...handleCors(request) }
    })
  }
}
