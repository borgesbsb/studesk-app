import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PUT - Atualizar progresso de uma disciplina em uma semana
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { disciplinaSemanaId, horasRealizadas, concluida, observacoes } = body

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
