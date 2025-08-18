import { NextRequest, NextResponse } from 'next/server'
import { SessaoQuestoesService } from '@/services/sessao-questoes.service'
import { SalvarRespostaRequest } from '@/domain/entities/SessaoQuestoes'

// POST - Salva resposta do usuário a uma questão
export async function POST(request: NextRequest) {
  try {
    const body: SalvarRespostaRequest = await request.json()
    
    // Validação básica
    if (!body.questaoId || !body.resposta) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados obrigatórios não fornecidos'
        },
        { status: 400 }
      )
    }

    // Validação da resposta (deve ser A, B, C, D ou E)
    if (!['A', 'B', 'C', 'D', 'E'].includes(body.resposta)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resposta deve ser A, B, C, D ou E'
        },
        { status: 400 }
      )
    }

    await SessaoQuestoesService.salvarResposta(body)

    return NextResponse.json({
      success: true,
      message: 'Resposta salva com sucesso'
    })
  } catch (error) {
    console.error('Erro ao salvar resposta:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao salvar resposta'
      },
      { status: 500 }
    )
  }
} 