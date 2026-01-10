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

    // Obter folderId da query string
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

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

    // Listar arquivos e pastas
    const files = await driveService.listFilesAndFolders(folderId)

    // Se estiver dentro de uma pasta, buscar info da pasta também
    let folderInfo = null
    if (folderId && folderId !== 'root') {
      try {
        folderInfo = await driveService.getFolderInfo(folderId)
      } catch (error) {
        console.warn('Erro ao buscar info da pasta:', error)
      }
    }

    return NextResponse.json({ files, folderInfo }, { headers: handleCors(request) })
  } catch (error) {
    console.error('Erro ao listar arquivos do Google Drive:', error)
    return NextResponse.json(
      { error: 'Falha ao listar arquivos do Google Drive' },
      { status: 500, headers: handleCors(request) }
    )
  }
}
