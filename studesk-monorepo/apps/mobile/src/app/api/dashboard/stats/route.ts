import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Retornar stats vazias por enquanto
    // TODO: Implementar lógica real de estatísticas
    return NextResponse.json({
      success: true,
      data: {
        totalMateriais: 0,
        totalDisciplinas: 0,
        materiaisRecentes: [],
        tempoEstudadoHoje: 0
      }
    })
  } catch (error) {
    console.error('[API] Erro ao buscar stats:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
