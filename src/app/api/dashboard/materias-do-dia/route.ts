import { NextRequest, NextResponse } from 'next/server'
import { getMateriasDoDia } from '@/interface/actions/dashboard/materias-do-dia'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataParam = searchParams.get('data')
    // Passar como string YYYY-MM-DD para evitar bug de fuso horário no servidor
    const materias = await getMateriasDoDia(dataParam || undefined)
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: true,
        data: materias
      },
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint materias-do-dia:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar matérias do dia'
      },
      { status: 500, headers }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Passar como string YYYY-MM-DD para evitar bug de fuso horário no servidor
    const materias = await getMateriasDoDia(body.data || undefined)
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: true,
        data: materias
      },
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint materias-do-dia:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar matérias do dia'
      },
      { status: 500, headers }
    )
  }
}
