import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Listar todos os planos de estudo
export async function GET() {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // 2. Buscar apenas planos do usuário
    const planos = await prisma.planoEstudo.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: true
              }
            }
          },
          orderBy: {
            numeroSemana: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(planos)
  } catch (error) {
    console.error('Erro ao buscar planos de estudo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar um novo plano de estudo
export async function POST(request: NextRequest) {
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
    const { nome, descricao, dataInicio, dataFim, semanas } = body

    // 2. Criar plano associado ao userId
    const plano = await prisma.planoEstudo.create({
      data: {
        nome,
        descricao,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        userId: session.user.id,
        semanas: {
          create: (Array.isArray(semanas) ? semanas : [])
            .filter((semana: any) => Array.isArray(semana.disciplinas) && semana.disciplinas.length > 0)
            .map((semana: any) => ({
            numeroSemana: semana.numeroSemana,
            dataInicio: new Date(semana.dataInicio),
            dataFim: new Date(semana.dataFim),
            observacoes: semana.observacoes,
            totalHoras: semana.totalHoras,
            disciplinas: {
              create: semana.disciplinas.map((disc: any) => ({
                disciplinaId: disc.disciplinaId,
                horasPlanejadas: disc.horasPlanejadas,
                prioridade: disc.prioridade,
                observacoes: disc.observacoes
              }))
            }
          }))
        }
      },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(plano, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar plano de estudo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
