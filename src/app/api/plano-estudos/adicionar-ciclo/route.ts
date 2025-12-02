import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      planoId,
      numeroSemana,
      dataInicio,
      dataFim,
      observacoes,
      totalHoras,
      disciplinas
    } = body

    // Validações básicas
    if (!planoId || !numeroSemana || !dataInicio || !dataFim) {
      return NextResponse.json(
        { error: 'Dados obrigatórios não fornecidos' },
        { status: 400 }
      )
    }

    // Verificar se o plano existe e pertence ao usuário
    const plano = await prisma.planoEstudo.findUnique({
      where: {
        id: planoId,
        userId: session.user.id
      }
    })

    if (!plano) {
      return NextResponse.json(
        { error: 'Plano de estudos não encontrado ou sem permissão' },
        { status: 404 }
      )
    }

    // Verificar se já existe uma semana com esse número
    const semanaExistente = await prisma.semanaEstudo.findUnique({
      where: {
        planoId_numeroSemana: {
          planoId,
          numeroSemana
        }
      }
    })

    if (semanaExistente) {
      return NextResponse.json(
        { error: `Já existe um ciclo ${numeroSemana} neste plano` },
        { status: 400 }
      )
    }

    // Criar a nova semana/ciclo
    const novaSemana = await prisma.semanaEstudo.create({
      data: {
        planoId,
        numeroSemana,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        observacoes,
        totalHoras: totalHoras || 0,
        disciplinas: {
          create: disciplinas?.map((disciplina: any) => ({
            disciplinaId: disciplina.disciplinaId,
            horasPlanejadas: disciplina.horasPlanejadas,
            prioridade: 2, // Valor padrão
            tipoVeiculo: disciplina.tipoVeiculo,
            materialNome: disciplina.materialNome,
            questoesPlanejadas: disciplina.questoesPlanejadas || 0,
            tempoVideoPlanejado: disciplina.tempoVideoPlanejado || 0,
            observacoes: disciplina.parametro, // Campo parametro vai para observacoes
            diasEstudo: disciplina.diasEstudo // Campo diasEstudo
          })) || []
        }
      },
      include: {
        disciplinas: {
          include: {
            disciplina: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: novaSemana
    })

  } catch (error) {
    console.error('Erro ao adicionar ciclo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
