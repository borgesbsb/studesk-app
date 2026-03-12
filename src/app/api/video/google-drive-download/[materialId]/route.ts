import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)
const THUMB_DIR = path.join(process.cwd(), 'public', 'thumbnails')

/**
 * Gera thumbnail em background a partir de um arquivo de vídeo temporário.
 * Não bloqueia a resposta ao cliente.
 */
function generateThumbnailInBackground(tmpFile: string, materialId: string) {
  const thumbPath = path.join(THUMB_DIR, `${materialId}.jpg`)

  // Se já existe thumbnail, só limpa o temp
  if (fs.existsSync(thumbPath)) {
    fs.unlink(tmpFile, () => {})
    return
  }

  fs.mkdirSync(THUMB_DIR, { recursive: true })

  const generate = async () => {
    try {
      try {
        await execFileAsync('ffmpeg', [
          '-ss', '60',
          '-i', tmpFile,
          '-vframes', '1',
          '-q:v', '5',
          '-vf', 'scale=320:-1',
          '-y',
          thumbPath,
        ], { timeout: 30000 })
      } catch {
        // Vídeo menor que 60s, tentar no segundo 5
        await execFileAsync('ffmpeg', [
          '-ss', '5',
          '-i', tmpFile,
          '-vframes', '1',
          '-q:v', '5',
          '-vf', 'scale=320:-1',
          '-y',
          thumbPath,
        ], { timeout: 30000 })
      }
      console.log(`✅ Thumbnail gerada durante download: ${materialId}`)
    } catch (err: any) {
      console.error(`❌ Falha ao gerar thumbnail: ${err?.message}`)
    } finally {
      fs.unlink(tmpFile, () => {})
    }
  }

  generate()
}

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
    // 1. Autenticação (suporta NextAuth web e JWT mobile)
    const auth = await requireAuth()

    const { materialId } = await params

    // 2. Buscar material no banco
    const material = await prisma.materialEstudo.findUnique({
      where: { id: materialId },
      include: { user: true }
    })

    if (!material) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    // Verificar acesso:
    // 1. Material pertence ao usuário, OU
    // 2. Material é admin/compartilhado (userId = null), OU
    // 3. Material está vinculado a um plano compartilhado do qual o usuário é participante
    const isOwner = material.userId === auth.userId
    const isShared = material.userId === null

    if (!isOwner && !isShared) {
      const accessViaPlano = await prisma.disciplinaSemanaMateria.findFirst({
        where: {
          materialId: material.id,
          disciplinaSemana: {
            semana: {
              plano: {
                usuarios: { some: { userId: auth.userId } },
              },
            },
          },
        },
      })

      if (!accessViaPlano) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
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

    // Verificar se o dono do material tem tokens do Google Drive
    if (!material.user || !material.user.googleDriveAccessToken || !material.user.googleDriveRefreshToken) {
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

    // Sempre tentar renovar o token para garantir que está válido
    try {
      console.log('Renovando token do Google Drive...')
      const { credentials } = await oauth2Client.refreshAccessToken()

      await prisma.user.update({
        where: { id: material.user.id },
        data: {
          googleDriveAccessToken: credentials.access_token,
          googleDriveTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        }
      })

      oauth2Client.setCredentials(credentials)
    } catch (refreshError: any) {
      console.error('Falha ao renovar token:', refreshError?.message)

      // Se o refresh token é inválido, limpar tokens do banco
      if (refreshError?.message?.includes('invalid_grant') || refreshError?.response?.data?.error === 'invalid_grant') {
        await prisma.user.update({
          where: { id: material.user.id },
          data: {
            googleDriveAccessToken: null,
            googleDriveRefreshToken: null,
            googleDriveTokenExpiry: null,
          }
        })

        return NextResponse.json(
          {
            error: 'Token do Google Drive expirado. Reconecte o Google Drive nas configurações.',
            code: 'GOOGLE_DRIVE_RECONNECT',
          },
          { status: 401 }
        )
      }

      throw refreshError
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

    // Salvar em temp file enquanto faz stream (para gerar thumbnail depois)
    const thumbPath = path.join(THUMB_DIR, `${materialId}.jpg`)
    const thumbExists = fs.existsSync(thumbPath)
    const tmpFile = thumbExists ? null : path.join(os.tmpdir(), `studesk_dl_${materialId}.mp4`)
    const writeStream = tmpFile ? fs.createWriteStream(tmpFile) : null

    // Converter Node.js stream para Web ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        stream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
          writeStream?.write(chunk)
        })

        stream.on('end', () => {
          controller.close()
          if (writeStream && tmpFile) {
            writeStream.end(() => {
              generateThumbnailInBackground(tmpFile, materialId)
            })
          }
        })

        stream.on('error', (error: Error) => {
          controller.error(error)
          writeStream?.destroy()
          if (tmpFile) fs.unlink(tmpFile, () => {})
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

  } catch (error: any) {
    console.error('Erro ao baixar vídeo do Google Drive:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error response data:', error?.response?.data)

    const details = error instanceof Error ? error.message : 'Erro desconhecido'
    const googleError = error?.response?.data?.error?.message || error?.errors?.[0]?.message || null

    return NextResponse.json(
      {
        error: 'Erro ao baixar vídeo',
        details,
        googleError,
      },
      { status: 500 }
    )
  }
}
