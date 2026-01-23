import { NextRequest, NextResponse } from 'next/server'
import { listarMateriaisPorDisciplina } from '@/interface/actions/material-estudo/list'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await listarMateriaisPorDisciplina(id)
    const headers = handleCors(request)

    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('Erro no endpoint materiais por disciplina:', error)
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar materiais da disciplina'
      },
      { status: 500, headers }
    )
  }
}
