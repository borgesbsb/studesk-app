import { NextRequest, NextResponse } from 'next/server'
import { buscarDisciplinaPorId } from '@/interface/actions/disciplina/list'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers = handleCors(request)

  try {
    const result = await buscarDisciplinaPorId(params.id)

    return NextResponse.json(
      result,
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint disciplina por id:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar disciplina'
      },
      { status: 500, headers }
    )
  }
}
