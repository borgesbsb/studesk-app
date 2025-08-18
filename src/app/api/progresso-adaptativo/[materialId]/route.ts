import { NextRequest, NextResponse } from 'next/server'
import { ProgressoAdaptativoService } from '@/services/progresso-adaptativo.service'

// GET - Busca o progresso adaptativo de um material
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const { materialId } = await params
    const progresso = await ProgressoAdaptativoService.buscarOuCriarProgresso(materialId)

    return NextResponse.json({
      success: true,
      data: progresso
    })
  } catch (error) {
    console.error('Erro ao buscar progresso:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao buscar progresso adaptativo'
      },
      { status: 500 }
    )
  }
}

// POST - Atualiza o progresso após uma sessão
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const { materialId } = await params
    const { pontuacao, percentualAcerto } = await request.json()

    if (typeof pontuacao !== 'number' || typeof percentualAcerto !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Pontuação e percentual de acerto são obrigatórios'
        },
        { status: 400 }
      )
    }

    const statusProgresso = await ProgressoAdaptativoService.atualizarProgresso(
      materialId,
      pontuacao,
      percentualAcerto
    )

    return NextResponse.json({
      success: true,
      data: statusProgresso
    })
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao atualizar progresso adaptativo'
      },
      { status: 500 }
    )
  }
} 