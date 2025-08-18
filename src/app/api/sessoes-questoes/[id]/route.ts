import { NextRequest, NextResponse } from 'next/server'
import { SessaoQuestoesService } from '@/services/sessao-questoes.service'

// GET - Busca uma sessão específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const sessao = await SessaoQuestoesService.buscarSessao(id)

    if (!sessao) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sessão não encontrada'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: sessao
    })
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao buscar sessão de questões'
      },
      { status: 500 }
    )
  }
}

// DELETE - Deleta uma sessão
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await SessaoQuestoesService.deletarSessao(id)

    return NextResponse.json({
      success: true,
      message: 'Sessão deletada com sucesso'
    })
  } catch (error) {
    console.error('Erro ao deletar sessão:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao deletar sessão de questões'
      },
      { status: 500 }
    )
  }
} 