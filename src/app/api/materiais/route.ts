import { NextRequest, NextResponse } from 'next/server'
import { listarMateriaisEstudo } from '@/interface/actions/material-estudo/list'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const result = await listarMateriaisEstudo()
    const headers = handleCors(request)

    return NextResponse.json(result, { headers })
  } catch (error) {
    console.error('Erro no endpoint materiais:', error)
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar materiais'
      },
      { status: 500, headers }
    )
  }
}
