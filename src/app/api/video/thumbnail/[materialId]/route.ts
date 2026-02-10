import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { google } from 'googleapis'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import os from 'os'

const execFileAsync = promisify(execFile)

const THUMB_DIR = path.join(process.cwd(), 'public', 'thumbnails')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await params

  try {
    // 1. Verificar se já existe thumbnail em cache
    const thumbPath = path.join(THUMB_DIR, `${materialId}.jpg`)
    if (fs.existsSync(thumbPath)) {
      const thumbBuffer = fs.readFileSync(thumbPath)
      return new NextResponse(thumbBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=2592000', // 30 dias
        },
      })
    }

    // 2. Buscar material no banco
    const material = await prisma.materialEstudo.findUnique({
      where: { id: materialId },
      include: { user: true },
    })

    if (!material || !material.googleDriveFileId) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404 })
    }

    // 3. Configurar Google Drive API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    if (!material.user.googleDriveAccessToken || !material.user.googleDriveRefreshToken) {
      return NextResponse.json({ error: 'Google Drive não conectado' }, { status: 403 })
    }

    oauth2Client.setCredentials({
      access_token: material.user.googleDriveAccessToken,
      refresh_token: material.user.googleDriveRefreshToken,
    })

    // Renovar token
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      await prisma.user.update({
        where: { id: material.user.id },
        data: {
          googleDriveAccessToken: credentials.access_token,
          googleDriveTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        },
      })
      oauth2Client.setCredentials(credentials)
    } catch (refreshError: any) {
      console.error('Falha ao renovar token para thumbnail:', refreshError?.message)
      return NextResponse.json({ error: 'Token do Google Drive expirado' }, { status: 401 })
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // 4. Baixar vídeo para temp file
    const tmpFile = path.join(os.tmpdir(), `studesk_thumb_${materialId}.mp4`)

    console.log(`🖼️ Gerando thumbnail para: ${material.nome}`)

    const response = await drive.files.get(
      { fileId: material.googleDriveFileId, alt: 'media' },
      { responseType: 'stream' }
    )

    // Escrever stream para arquivo temp
    await new Promise<void>((resolve, reject) => {
      const writeStream = fs.createWriteStream(tmpFile)
      // @ts-ignore
      response.data.pipe(writeStream)
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
      // @ts-ignore
      response.data.on('error', reject)
    })

    // 5. Extrair frame com ffmpeg no segundo 60 (1:00)
    fs.mkdirSync(THUMB_DIR, { recursive: true })

    try {
      await execFileAsync('ffmpeg', [
        '-ss', '60',       // Seek para 1:00
        '-i', tmpFile,
        '-vframes', '1',   // Apenas 1 frame
        '-q:v', '5',       // Qualidade (2=melhor, 31=pior)
        '-vf', 'scale=320:-1', // Largura 320px, altura proporcional
        '-y',              // Sobrescrever
        thumbPath,
      ], { timeout: 30000 })
    } catch (ffmpegError: any) {
      // Se o vídeo é menor que 60s, tentar no segundo 5
      console.log('⚠️ Frame em 1:00 falhou, tentando em 5s...')
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

    // 6. Limpar arquivo temp
    fs.unlinkSync(tmpFile)

    // 7. Retornar thumbnail
    if (!fs.existsSync(thumbPath)) {
      return NextResponse.json({ error: 'Falha ao gerar thumbnail' }, { status: 500 })
    }

    const thumbBuffer = fs.readFileSync(thumbPath)
    console.log(`✅ Thumbnail gerada: ${materialId} (${thumbBuffer.length} bytes)`)

    return new NextResponse(thumbBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=2592000',
      },
    })
  } catch (error: any) {
    console.error('❌ Erro ao gerar thumbnail:', error?.message)
    return NextResponse.json(
      { error: 'Erro ao gerar thumbnail', details: error?.message },
      { status: 500 }
    )
  }
}
