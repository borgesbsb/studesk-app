import { NextRequest, NextResponse } from 'next/server'
import { PontuacaoService } from '@/services/pontuacao.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessaoQuestoesId } = body

    if (!sessaoQuestoesId) {
      return NextResponse.json({
        success: false,
        error: 'sessaoQuestoesId é obrigatório'
      }, { status: 400 })
    }

    console.log('Iniciando sessão de pontuação para sessão:', sessaoQuestoesId)

    const sessaoRealizada = await PontuacaoService.iniciarSessao({
      sessaoQuestoesId
    })

    console.log('Sessão iniciada com sucesso:', {
      id: sessaoRealizada.id,
      totalQuestoes: sessaoRealizada.totalQuestoes
    })

    return NextResponse.json({
      success: true,
      data: sessaoRealizada
    })

  } catch (error) {
    console.error('Erro ao iniciar sessão de pontuação:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 