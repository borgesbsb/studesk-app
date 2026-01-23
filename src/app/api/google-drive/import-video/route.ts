import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { GoogleDriveService } from '@/lib/google-drive'
import { handleCors } from '@/lib/cors'

/**
 * API Endpoint: Importar Vídeo do Google Drive (apenas metadados)
 *
 * Este endpoint:
 * 1. Recebe fileId e nome do vídeo
 * 2. Busca metadados do Google Drive (tamanho, duração estimada)
 * 3. Cadastra vídeo no banco com googleDriveFileId
 * 4. NÃO faz download do vídeo (streaming via Google Drive)
 */

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    const body = await request.json()
    const { fileId, fileName, disciplinaId } = body

    if (!fileId || !fileName || !disciplinaId) {
      return NextResponse.json(
        { error: 'fileId, fileName e disciplinaId são obrigatórios' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Buscar tokens do usuário
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

    // Buscar metadados do vídeo no Google Drive
    const metadata = await driveService.getFileMetadata(fileId)

    // Estimar duração baseada no tamanho (1MB ≈ 1 segundo)
    const sizeBytes = parseInt(metadata.size || '0')
    const sizeMB = sizeBytes / (1024 * 1024)
    const estimatedDuration = Math.round(sizeMB)

    // Verificar se vídeo já foi importado
    const existingVideo = await prisma.materialEstudo.findFirst({
      where: {
        userId,
        googleDriveFileId: fileId,
      },
    })

    if (existingVideo) {
      return NextResponse.json(
        { error: 'Este vídeo já foi importado anteriormente' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Cadastrar vídeo no banco (apenas metadados)
    const material = await prisma.materialEstudo.create({
      data: {
        userId,
        nome: fileName.replace(/\.(mp4|avi|mkv|webm)$/i, ''),
        tipo: 'VIDEO',
        totalPaginas: 0,
        paginasLidas: 0,
        duracaoSegundos: estimatedDuration,
        tempoAssistido: 0,
        arquivoVideoUrl: `gdrive://${fileId}`, // Marker para Google Drive
        googleDriveFileId: fileId,
        googleDriveFileName: fileName,
        fonteOrigem: 'Google Drive (importado via UI)',
      },
    })

    // Associar à disciplina
    await prisma.disciplinaMaterial.create({
      data: {
        disciplinaId,
        materialId: material.id,
      },
    })

    console.log(`✅ Vídeo importado: ${fileName} (fileId: ${fileId})`)

    return NextResponse.json(
      {
        success: true,
        material: {
          id: material.id,
          nome: material.nome,
          tipo: material.tipo,
          duracaoSegundos: material.duracaoSegundos,
          googleDriveFileId: material.googleDriveFileId,
        },
      },
      { headers: handleCors(request) }
    )
  } catch (error) {
    console.error('Erro ao importar vídeo do Google Drive:', error)
    return NextResponse.json(
      {
        error: 'Falha ao importar vídeo',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500, headers: handleCors(request) }
    )
  }
}
