import { NextRequest, NextResponse } from 'next/server'
import { SessaoQuestoesService } from '@/services/sessao-questoes.service'

// GET - Gera estatísticas de uma sessão
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const estatisticas = await SessaoQuestoesService.gerarEstatisticas(id)

    return NextResponse.json({
      success: true,
      data: estatisticas
    })
  } catch (error) {
    console.error('Erro ao gerar estatísticas:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao gerar estatísticas da sessão'
      },
      { status: 500 }
    )
  }
} 