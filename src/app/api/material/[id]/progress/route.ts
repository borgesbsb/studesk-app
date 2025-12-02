import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { paginasLidas, tempoAssistido } = body

    // Buscar o material para verificar o tipo
    const material = await prisma.materialEstudo.findUnique({
      where: { id }
    })

    if (!material) {
      return NextResponse.json(
        { success: false, error: 'Material não encontrado' },
        { status: 404 }
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
    })

  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar progresso'
      },
      { status: 500 }
    )
  }
}
