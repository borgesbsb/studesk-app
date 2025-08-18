import { NextRequest, NextResponse } from 'next/server'
import { SessaoQuestoesService } from '@/services/sessao-questoes.service'
import { CriarSessaoQuestoesRequest } from '@/domain/entities/SessaoQuestoes'

// GET - Lista sessões de questões
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const materialId = searchParams.get('materialId')
    const disciplinaId = searchParams.get('disciplinaId')

    const sessoes = await SessaoQuestoesService.listarSessoes(
      materialId || undefined,
      disciplinaId || undefined
    )

    return NextResponse.json({
      success: true,
      data: sessoes
    })
  } catch (error) {
    console.error('Erro ao listar sessões:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao listar sessões de questões'
      },
      { status: 500 }
    )
  }
}

// POST - Cria uma nova sessão de questões
export async function POST(request: NextRequest) {
  try {
    const body: CriarSessaoQuestoesRequest = await request.json()
    
    // Validação básica
    if (!body.titulo || !body.prompt || !body.questoes || body.questoes.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Dados obrigatórios não fornecidos'
        },
        { status: 400 }
      )
    }

    const sessao = await SessaoQuestoesService.criarSessao(body)

    return NextResponse.json({
      success: true,
      data: sessao
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar sessão:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao criar sessão de questões'
      },
      { status: 500 }
    )
  }
} 