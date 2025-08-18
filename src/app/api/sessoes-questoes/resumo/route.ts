import { NextRequest, NextResponse } from 'next/server'
import { SessaoQuestoesService } from '@/services/sessao-questoes.service'

// GET - Lista sessões resumidas para seleção
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const disciplinaId = searchParams.get('disciplinaId')

    const sessoes = await SessaoQuestoesService.listarSessoesResumo(
      materialId || undefined,
      disciplinaId || undefined
    )

    return NextResponse.json({
      success: true,
      data: sessoes
    })
  } catch (error) {
    console.error('Erro ao listar sessões resumo:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao listar sessões de questões'
      },
      { status: 500 }
    )
  }
} 