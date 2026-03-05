import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { handleCors } from '@/lib/cors'
import { requireAuth } from '@/lib/auth-helpers'

/**
 * API Endpoint: Atualizar duração real de vídeo
 *
 * Quando um vídeo é carregado no player, a duração REAL é detectada
 * e atualizada no banco (substituindo a estimativa inicial).
 * Suporta NextAuth (web) e JWT (mobile).
 */

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Verificar autenticação (suporta NextAuth e JWT)
    let auth
    try {
      auth = await requireAuth()
    } catch {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { id } = await params
    const materialId = id

    const body = await request.json()
    const { duracaoSegundos } = body

    if (!duracaoSegundos || duracaoSegundos < 0) {
      return NextResponse.json(
        { error: 'duracaoSegundos inválida' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // 2. Verificar que o material existe e pertence ao usuário ou é admin (userId: null)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        OR: [{ userId: auth.userId }, { userId: null }]
      },
      select: { id: true, tipo: true, duracaoSegundos: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    if (material.tipo !== 'VIDEO') {
      return NextResponse.json(
        { error: 'Material não é um vídeo' },
        { status: 400, headers: handleCors(request) }
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
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('❌ Erro ao atualizar duração:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar duração do vídeo' },
      { status: 500, headers: handleCors(request) }
    )
  }
}
