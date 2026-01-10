import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { GoogleDriveService } from '@/lib/google-drive'
import { handleCors } from '@/lib/cors'

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // Obter fileId da query string
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId é obrigatório' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Buscar tokens do usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        googleDriveAccessToken: true,
        googleDriveRefreshToken: true,
      },
    })

    if (!user?.googleDriveAccessToken) {
      return NextResponse.json(
        { error: 'Usuário não conectou o Google Drive' },
        { status: 401, headers: handleCors(request) }
      )
    }

    // Criar instância do serviço
    const driveService = new GoogleDriveService(
      user.googleDriveAccessToken,
      user.googleDriveRefreshToken || undefined
    )

    // Baixar arquivo do Google Drive
    const fileBuffer = await driveService.downloadPdfBuffer(fileId)

    // Retornar o PDF com headers CORS
    return new NextResponse(fileBuffer, {
      headers: {
        ...handleCors(request),
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Erro ao baixar PDF do Google Drive:', error)
    return NextResponse.json(
      { error: 'Falha ao baixar PDF do Google Drive' },
      { status: 500, headers: handleCors(request) }
    )
  }
}
