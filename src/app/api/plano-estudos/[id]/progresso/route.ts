import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// PUT - Atualizar progresso de uma disciplina em uma semana
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { disciplinaSemanaId, horasRealizadas, concluida, observacoes } = body

    // 2. Verificar ownership através do plano de estudo
    const disciplinaSemanaExistente = await prisma.disciplinaSemana.findUnique({
      where: { id: disciplinaSemanaId },
      include: {
        semana: {
          include: {
            plano: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    })

    if (!disciplinaSemanaExistente || disciplinaSemanaExistente.semana.plano.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Disciplina da semana não encontrada' },
        { status: 404 }
      )
    }

    // 3. Atualizar
    const disciplinaSemana = await prisma.disciplinaSemana.update({
      where: { id: disciplinaSemanaId },
      data: {
        horasRealizadas,
        concluida,
        observacoes
      },
      include: {
        disciplina: true,
        semana: true
      }
    })

    // Atualizar total de horas realizadas da semana
    const totalHorasRealizadas = await prisma.disciplinaSemana.aggregate({
      where: { semanaId: disciplinaSemana.semanaId },
      _sum: { horasRealizadas: true }
    })

    await prisma.semanaEstudo.update({
      where: { id: disciplinaSemana.semanaId },
      data: {
        horasRealizadas: totalHorasRealizadas._sum.horasRealizadas || 0
      }
    })

    return NextResponse.json(disciplinaSemana)
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
