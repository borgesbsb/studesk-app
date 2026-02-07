import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

/**
 * API Endpoint: Streaming de Vídeos do Google Drive
 *
 * Este endpoint:
 * 1. Recebe materialId
 * 2. Busca googleDriveFileId no banco
 * 3. Usa OAuth tokens do usuário para acessar Google Drive
 * 4. Gera URL de download com token de acesso
 * 5. Faz proxy/streaming do vídeo com suporte a Range requests
 *
 * Suporte a Range: Permite seek no player HTML5
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    // 1. Autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { materialId } = await params

    // 2. Buscar material no banco
    const material = await prisma.materialEstudo.findUnique({
      where: { id: materialId },
      include: { user: true }
    })

    if (!material) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    // Verificar se é do usuário
    if (material.user.email !== session.user.email) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // 3. Verificar se é vídeo do Google Drive
    if (!material.googleDriveFileId) {
      return NextResponse.json(
        { error: 'Material não é um vídeo do Google Drive' },
        { status: 400 }
      )
    }

    // 4. Configurar OAuth2 client do Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Verificar se usuário tem tokens do Google Drive
    if (!material.user.googleDriveAccessToken || !material.user.googleDriveRefreshToken) {
      return NextResponse.json(
        { error: 'Usuário não autorizou acesso ao Google Drive' },
        { status: 403 }
      )
    }

    // Configurar tokens
    oauth2Client.setCredentials({
      access_token: material.user.googleDriveAccessToken,
      refresh_token: material.user.googleDriveRefreshToken,
    })

    // Verificar se token expirou e renovar se necessário
    if (material.user.googleDriveTokenExpiry && material.user.googleDriveTokenExpiry < new Date()) {
      console.log('Token expirado, renovando...')
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Atualizar tokens no banco
      await prisma.user.update({
        where: { id: material.user.id },
        data: {
          googleDriveAccessToken: credentials.access_token,
          googleDriveTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        }
      })

      oauth2Client.setCredentials(credentials)
    }

    // 5. Fazer streaming do Google Drive
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Obter Range header se existir (para seek no player)
    const rangeHeader = request.headers.get('range')

    // Download do arquivo
    const response = await drive.files.get(
      {
        fileId: material.googleDriveFileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
        headers: rangeHeader ? { Range: rangeHeader } : {},
      }
    )

    // Obter tamanho do arquivo
    const fileMetadata = await drive.files.get({
      fileId: material.googleDriveFileId,
      fields: 'size, mimeType',
    })

    const fileSize = parseInt(fileMetadata.data.size || '0')
    const mimeType = fileMetadata.data.mimeType || 'video/mp4'

    // 6. Configurar headers de resposta
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    }

    let status = 200

    // Se tem Range, processar
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunkSize = end - start + 1

      status = 206 // Partial Content
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`
      headers['Content-Length'] = chunkSize.toString()
    } else {
      headers['Content-Length'] = fileSize.toString()
    }

    // 7. Retornar stream
    // @ts-ignore - response.data é um stream
    const stream = response.data

    // Converter Node.js stream para Web ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        stream.on('end', () => {
          controller.close()
        })

        stream.on('error', (error: Error) => {
          controller.error(error)
        })
      },
    })

    return new NextResponse(readableStream, {
      status,
      headers,
    })

  } catch (error: any) {
    console.error('Erro ao fazer streaming do Google Drive:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error response data:', error?.response?.data)

    const details = error instanceof Error ? error.message : 'Erro desconhecido'
    const googleError = error?.response?.data?.error?.message || error?.errors?.[0]?.message || null

    return NextResponse.json(
      {
        error: 'Erro ao fazer streaming do vídeo',
        details,
        googleError,
      },
      { status: 500 }
    )
  }
}
