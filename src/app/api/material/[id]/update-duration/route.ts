import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * API Endpoint: Atualizar duração real de vídeo
 *
 * Quando um vídeo é carregado no player, a duração REAL é detectada
 * e atualizada no banco (substituindo a estimativa inicial).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const materialId = id

    const body = await request.json()
    const { duracaoSegundos } = body

    if (!duracaoSegundos || duracaoSegundos < 0) {
      return NextResponse.json(
        { error: 'duracaoSegundos inválida' },
        { status: 400 }
      )
    }

    // 2. Verificar ownership do material
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      },
      select: { id: true, tipo: true, duracaoSegundos: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    if (material.tipo !== 'VIDEO') {
      return NextResponse.json(
        { error: 'Material não é um vídeo' },
        { status: 400 }
      )
    }

    console.log('📐 Atualizando duração do vídeo:', {
      materialId,
      duracaoAnterior: material.duracaoSegundos,
      duracaoNova: duracaoSegundos
    })

    // 3. Atualizar duração no banco
    await prisma.materialEstudo.update({
      where: { id: materialId },
      data: { duracaoSegundos }
    })

    console.log('✅ Duração atualizada com sucesso')

    return NextResponse.json({
      success: true,
      duracaoSegundos
    })
  } catch (error) {
    console.error('❌ Erro ao atualizar duração:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar duração do vídeo' },
      { status: 500 }
    )
  }
}
