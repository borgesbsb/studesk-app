import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Listar todos os planos de estudo
export async function GET() {
  try {
    const planos = await prisma.planoEstudo.findMany({
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
    const body = await request.json()
    const { nome, descricao, dataInicio, dataFim, semanas } = body

    const plano = await prisma.planoEstudo.create({
      data: {
        nome,
        descricao,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        semanas: {
          create: semanas.map((semana: any) => ({
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
