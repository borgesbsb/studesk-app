import { NextRequest, NextResponse } from 'next/server'
import { adicionarQuestoes } from '@/interface/actions/dashboard/adicionar-questoes'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { disciplinaId, quantidade, data } = body

    if (!disciplinaId || !quantidade) {
      const headers = handleCors(request)
      return NextResponse.json(
        {
          success: false,
          error: 'disciplinaId e quantidade são obrigatórios'
        },
        { status: 400, headers }
      )
    }

    const dataObj = data ? new Date(data) : undefined
    const result = await adicionarQuestoes({ disciplinaId, quantidade, data: dataObj })
    const headers = handleCors(request)

    return NextResponse.json(
      result,
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint adicionar-questoes:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao adicionar questões'
      },
      { status: 500, headers }
    )
  }
}
