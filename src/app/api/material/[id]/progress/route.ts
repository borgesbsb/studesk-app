import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { MaterialEstudoService } from '@/application/services/material-estudo.service'

export async function POST(
  request: NextRequest,
  { params }: any
): Promise<NextResponse> {
  try {
    const { paginasLidas } = await request.json()
    const id = params.id

    console.log('📝 API - Atualizando progresso:', { id, paginasLidas })

    // Primeiro busca o material para obter o total de páginas
    const materialAtual = await prisma.materialEstudo.findUnique({
      where: { id },
      select: { 
        id: true,
        totalPaginas: true,
        paginasLidas: true,
        nome: true 
      }
    })

    if (!materialAtual) {
      console.log('❌ API - Material não encontrado:', id)
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    console.log('📚 API - Material atual:', materialAtual)

    // Atualiza o material com o novo progresso usando o service
    const material = await MaterialEstudoService.atualizarProgressoLeitura(id, paginasLidas)
    
    console.log('✅ API - Material atualizado:', material)

    return NextResponse.json({ 
      success: true, 
      material,
      message: `Progresso atualizado para ${paginasLidas} páginas`
    })
  } catch (error) {
    console.error('❌ API - Erro ao atualizar progresso:', error)
    console.error('❌ API - Stack trace:', error instanceof Error ? error.stack : 'No stack trace available')
    return NextResponse.json(
      { error: 'Erro ao atualizar progresso' },
      { status: 500 }
    )
  }
} 