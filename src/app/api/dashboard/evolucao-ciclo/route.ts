import { NextRequest, NextResponse } from 'next/server'
import { getEvolucaoCiclo } from '@/interface/actions/dashboard/get-evolucao-ciclo'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const evolucao = await getEvolucaoCiclo()
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: true,
        data: evolucao
      },
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint evolucao-ciclo:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar evolução do ciclo'
      },
      { status: 500, headers }
    )
  }
}
