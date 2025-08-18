import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET - Buscar um plano de estudo específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const plano = await prisma.planoEstudo.findUnique({
      where: { id },
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
      }
    })

    if (!plano) {
      return NextResponse.json(
        { error: 'Plano de estudo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(plano)
  } catch (error) {
    console.error('Erro ao buscar plano de estudo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar um plano de estudo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nome, descricao, dataInicio, dataFim, ativo } = body

    const plano = await prisma.planoEstudo.update({
      where: { id },
      data: {
        nome,
        descricao,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim) : undefined,
        ativo
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

    return NextResponse.json(plano)
  } catch (error) {
    console.error('Erro ao atualizar plano de estudo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir um plano de estudo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.planoEstudo.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Plano de estudo excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir plano de estudo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
