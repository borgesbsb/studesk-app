import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params
    const disciplinaId = params.id
    const hoje = new Date()
    const inicioDia = startOfDay(hoje)
    const fimDia = endOfDay(hoje)

    // 2. Buscar plano ativo do usuário que contenha hoje
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId: session.user.id,
        ativo: true,
        AND: [
          {
            dataInicio: {
              lte: fimDia
            }
          },
          {
            dataFim: {
              gte: inicioDia
            }
          }
        ]
      }
    })

    if (!planoAtivo) {
      return NextResponse.json(
        { error: 'Nenhum plano de estudo ativo encontrado' },
        { status: 404 }
      )
    }

    // Buscar semana atual do plano
    const semanaAtual = await prisma.semanaEstudo.findFirst({
      where: {
        planoId: planoAtivo.id,
        dataInicio: {
          lte: fimDia
        },
        dataFim: {
          gte: inicioDia
        }
      }
    })

    if (!semanaAtual) {
      return NextResponse.json(
        { error: 'Semana de estudo não encontrada para o período' },
        { status: 404 }
      )
    }

    // Buscar a disciplina na semana
    const disciplinaSemana = await prisma.disciplinaSemana.findFirst({
      where: {
        semanaId: semanaAtual.id,
        disciplinaId: disciplinaId
      },
      include: {
        disciplina: {
          select: {
            nome: true
          }
        },
        semana: {
          select: {
            numeroSemana: true,
            dataInicio: true,
            dataFim: true
          }
        }
      }
    })

    if (!disciplinaSemana) {
      return NextResponse.json(
        { error: 'Disciplina não encontrada na semana de estudo atual' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      disciplinaSemanaId: disciplinaSemana.id,
      disciplinaNome: disciplinaSemana.disciplina.nome,
      numeroSemana: disciplinaSemana.semana.numeroSemana,
      horasPlanejadas: disciplinaSemana.horasPlanejadas,
      horasRealizadas: disciplinaSemana.horasRealizadas,
      dataInicio: disciplinaSemana.semana.dataInicio,
      dataFim: disciplinaSemana.semana.dataFim
    })
  } catch (error) {
    console.error('Erro ao buscar ciclo atual da disciplina:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar ciclo atual' },
      { status: 500 }
    )
  }
}
