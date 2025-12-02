import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'ID do material é obrigatório' },
        { status: 400 }
      )
    }

    // 2. Verificar se o material existe e pertence ao usuário
    const materialExistente = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      }
    })

    if (!materialExistente) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Reiniciar o progresso (definir paginasLidas como 0)
    const materialAtualizado = await prisma.materialEstudo.update({
      where: { id: materialId },
      data: {
        paginasLidas: 0,
        updatedAt: new Date()
      }
    })

    console.log('✅ Progresso reiniciado para o material:', materialId)

    return NextResponse.json({
      success: true,
      message: 'Progresso reiniciado com sucesso',
      material: {
        id: materialAtualizado.id,
        paginasLidas: materialAtualizado.paginasLidas,
        totalPaginas: materialAtualizado.totalPaginas
      }
    })

  } catch (error) {
    console.error('❌ Erro ao reiniciar progresso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 