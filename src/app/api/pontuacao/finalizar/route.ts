import { NextRequest, NextResponse } from 'next/server'
import { PontuacaoService } from '@/services/pontuacao.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessaoRealizadaId, respostas, tempoTotalSegundos } = body

    if (!sessaoRealizadaId) {
      return NextResponse.json({
        success: false,
        error: 'sessaoRealizadaId é obrigatório'
      }, { status: 400 })
    }

    if (!respostas || !Array.isArray(respostas)) {
      return NextResponse.json({
        success: false,
        error: 'respostas deve ser um array'
      }, { status: 400 })
    }

    console.log('Finalizando sessão de pontuação:', {
      sessaoId: sessaoRealizadaId,
      totalRespostas: respostas.length,
      tempoTotal: tempoTotalSegundos
    })

    const sessaoFinalizada = await PontuacaoService.finalizarSessao({
      sessaoRealizadaId,
      respostas,
      tempoTotalSegundos
    })

    console.log('Sessão finalizada com sucesso:', {
      pontuacao: sessaoFinalizada.pontuacao,
      percentualAcerto: sessaoFinalizada.percentualAcerto,
      questoesCorretas: sessaoFinalizada.questoesCorretas,
      questoesIncorretas: sessaoFinalizada.questoesIncorretas
    })

    return NextResponse.json({
      success: true,
      data: sessaoFinalizada
    })

  } catch (error) {
    console.error('Erro ao finalizar sessão de pontuação:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 