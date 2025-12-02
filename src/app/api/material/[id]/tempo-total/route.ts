import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const materialId = id

    // 2. Verificar ownership do material
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      },
      select: { id: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    console.log('⏱️ API - Buscando tempo total de estudo do material:', { materialId, userId: session.user.id })

    // Buscar TODOS os registros de histórico de leitura, independente de estarem associados a sessões
    const historicoLeitura = await prisma.historicoLeitura.findMany({
      where: {
        materialId
      },
      select: {
        tempoLeituraSegundos: true
      }
    })

    // Somar todos os tempos
    const totalSegundos = historicoLeitura.reduce(
      (acc, registro) => acc + (registro.tempoLeituraSegundos || 0),
      0
    )

    const totalMinutos = Math.round(totalSegundos / 60)
    const totalHoras = Math.round((totalSegundos / 3600) * 100) / 100 // 2 casas decimais

    console.log(`✅ API - Tempo total calculado:`, {
      totalRegistros: historicoLeitura.length,
      totalSegundos,
      totalMinutos,
      totalHoras
    })

    return NextResponse.json({
      success: true,
      totalSegundos,
      totalMinutos,
      totalHoras,
      totalRegistros: historicoLeitura.length
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar tempo total:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar tempo total de estudo' },
      { status: 500 }
    )
  }
}
