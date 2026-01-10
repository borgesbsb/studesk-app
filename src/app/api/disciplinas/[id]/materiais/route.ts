import { NextRequest, NextResponse } from 'next/server'
import { listarMateriaisPorDisciplina } from '@/interface/actions/material-estudo/list'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  const headers = handleCors(request)
  return NextResponse.json({}, { headers })
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const headers = handleCors(request)

  try {
    const result = await listarMateriaisPorDisciplina(params.id)

    return NextResponse.json(
      result,
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint materiais por disciplina:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar materiais da disciplina'
      },
      { status: 500, headers }
    )
  }
}
