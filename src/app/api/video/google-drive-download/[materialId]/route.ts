import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'

/**
 * API Endpoint: Download Completo de Vídeos do Google Drive (para cache)
 *
 * Este endpoint:
 * 1. Recebe materialId
 * 2. Busca googleDriveFileId no banco
 * 3. Faz download completo do vídeo do Google Drive
 * 4. Retorna o vídeo como blob para salvar no IndexedDB
 *
 * Diferença do endpoint de streaming:
 * - Streaming: range requests, ideal para playback direto
 * - Download: arquivo completo, ideal para cache offline
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

    // 5. Obter metadados do arquivo
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const fileMetadata = await drive.files.get({
      fileId: material.googleDriveFileId,
      fields: 'size, mimeType, name',
    })

    const fileSize = parseInt(fileMetadata.data.size || '0')
    const mimeType = fileMetadata.data.mimeType || 'video/mp4'
    const fileName = fileMetadata.data.name || material.googleDriveFileName || 'video.mp4'

    // 6. Fazer download completo
    const response = await drive.files.get(
      {
        fileId: material.googleDriveFileId,
        alt: 'media',
      },
      {
        responseType: 'stream',
      }
    )

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

    // 7. Retornar stream com headers para download
    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileSize.toString(),
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache por 1 ano
      },
    })

  } catch (error) {
    console.error('Erro ao baixar vídeo do Google Drive:', error)

    return NextResponse.json(
      {
        error: 'Erro ao baixar vídeo',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
