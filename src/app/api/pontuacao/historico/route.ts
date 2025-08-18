import { NextRequest, NextResponse } from 'next/server'
import { PontuacaoService } from '@/services/pontuacao.service'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const materialId = url.searchParams.get('materialId') || undefined
    const disciplinaId = url.searchParams.get('disciplinaId') || undefined
    const limite = parseInt(url.searchParams.get('limite') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const tipo = url.searchParams.get('tipo') || 'historico' // 'historico' ou 'estatisticas'

    console.log('Buscando dados de pontuação:', {
      tipo,
      materialId,
      disciplinaId,
      limite,
      offset
    })

    if (tipo === 'estatisticas') {
      const estatisticas = await PontuacaoService.buscarEstatisticasProgresso({
        materialId,
        disciplinaId
      })

      return NextResponse.json({
        success: true,
        data: estatisticas
      })
    } else {
      const historico = await PontuacaoService.listarHistorico({
        materialId,
        disciplinaId,
        limite,
        offset
      })

      return NextResponse.json({
        success: true,
        data: historico
      })
    }

  } catch (error) {
    console.error('Erro ao buscar dados de pontuação:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 