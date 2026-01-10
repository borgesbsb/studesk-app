import { NextRequest, NextResponse } from 'next/server'
import { getDashboardStats } from '@/interface/actions/dashboard/get-stats'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest) {
  try {
    const stats = await getDashboardStats()
    const headers = handleCors(request)

    return NextResponse.json(
      {
        success: true,
        data: stats
      },
      { headers }
    )
  } catch (error) {
    console.error('Erro no endpoint stats:', error)
    const headers = handleCors(request)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar estatísticas'
      },
      { status: 500, headers }
    )
  }
}
