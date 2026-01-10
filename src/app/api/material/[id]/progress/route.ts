import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleCors } from '@/lib/cors'

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

async function updateProgress(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { id } = await params
    const body = await request.json()

    const { paginasLidas, tempoAssistido } = body

    // 2. Buscar o material e verificar ownership
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Atualizar o progresso baseado no tipo
    const updateData: any = {}

    if (material.tipo === 'VIDEO' && tempoAssistido !== undefined) {
      updateData.tempoAssistido = tempoAssistido
    } else if (material.tipo === 'PDF' && paginasLidas !== undefined) {
      // Atualizar paginasLidas se for array
      if (Array.isArray(paginasLidas)) {
        updateData.paginasLidas = Math.max(...paginasLidas, 0)
      } else {
        updateData.paginasLidas = paginasLidas
      }
    }

    const updatedMaterial = await prisma.materialEstudo.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: updatedMaterial
    }, { headers: handleCors(request) })

  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar progresso'
      },
      { status: 500, headers: handleCors(request) }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateProgress(request, { params })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateProgress(request, { params })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { success: false, error: 'Não autorizado' },
    //     { status: 401, headers: handleCors(request) }
    //   )
    // }

    const { id } = await params

    // Buscar o material (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id,
        // userId: session.user.id  // COMENTADO PARA POC
      },
      select: {
        id: true,
        tipo: true,
        paginasLidas: true,
        tempoAssistido: true,
        totalPaginas: true,
      }
    })

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        paginasLidas: material.paginasLidas || 0,
        tempoAssistido: material.tempoAssistido || 0,
        totalPaginas: material.totalPaginas || 0,
        tipo: material.tipo,
      }
    }, { headers: handleCors(request) })

  } catch (error) {
    console.error('Erro ao buscar progresso:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar progresso'
      },
      { status: 500, headers: handleCors(request) }
    )
  }
}
