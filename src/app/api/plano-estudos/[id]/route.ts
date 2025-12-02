import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET - Buscar um plano de estudo específico
export async function GET(
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

    const { id } = await params

    // 2. Buscar plano e verificar ownership
    const plano = await prisma.planoEstudo.findUnique({
      where: {
        id,
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
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { nome, descricao, dataInicio, dataFim, ativo } = body

    // 2. Verificar ownership antes de atualizar
    const planoExistente = await prisma.planoEstudo.findUnique({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!planoExistente) {
      return NextResponse.json(
        { error: 'Plano de estudo não encontrado' },
        { status: 404 }
      )
    }

    // 3. Atualizar
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
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // 2. Verificar ownership antes de deletar
    const planoExistente = await prisma.planoEstudo.findUnique({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!planoExistente) {
      return NextResponse.json(
        { error: 'Plano de estudo não encontrado' },
        { status: 404 }
      )
    }

    // 3. Deletar
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
