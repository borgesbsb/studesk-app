import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@studesk/database'

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

    // Por enquanto, retornar array vazio
    // TODO: Implementar lógica real de busca de matérias do dia
    return NextResponse.json({
      success: true,
      data: []
    })
  } catch (error) {
    console.error('[API] Erro ao buscar matérias do dia:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar matérias do dia' },
      { status: 500 }
    )
  }
}
