import { NextRequest, NextResponse } from 'next/server'
import { adicionarTempoManual } from '@/interface/actions/dashboard/adicionar-tempo-manual'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { disciplinaId, minutos, data } = body

    if (!disciplinaId || !minutos) {
      const headers = handleCors(request)
      return NextResponse.json(
        {
          success: false,
          error: 'disciplinaId e minutos são obrigatórios'
        },
        { status: 400, headers }
      )
    }

    const dataObj = data ? new Date(data) : undefined
    const result = await adicionarTempoManual({ disciplinaId, horas: 0, minutos, data: dataObj })
    const headers = handleCors(request)

    return NextResponse.json(
      result,
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint adicionar-tempo:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao adicionar tempo'
      },
      { status: 500, headers }
    )
  }
}
