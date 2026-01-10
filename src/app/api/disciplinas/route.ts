import { NextRequest, NextResponse } from 'next/server'
import { listarDisciplinas } from '@/interface/actions/disciplina/list'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const result = await listarDisciplinas()
    const headers = handleCors(request)

    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('Erro no endpoint disciplinas:', error)
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar disciplinas'
      },
      { status: 500, headers }
    )
  }
}
