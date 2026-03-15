import { prisma } from "@/lib/prisma"

export interface ConfigDisciplinaResumo {
  disciplinaId: string
  totalQuestoes: number
  disciplina: { id: string; nome: string; cor: string | null }
}

export interface SimuladoEvento {
  id: string
  nome: string
  dataRealizacao: Date
  ativo: boolean
  config: { id: string; nome: string; totalQuestoes: number; disciplinas: ConfigDisciplinaResumo[] } | null
  totalParticipantes: number
  meuResultado: {
    id: string
    totalQuestoes: number
    totalAcertos: number
    percentualGeral: number
    disciplinas: {
      id: string
      disciplina: { id: string; nome: string; cor: string | null }
      totalQuestoes: number
      acertos: number
      percentual: number
    }[]
  } | null
}

export class SimuladoService {
  static getStatusCor(percentual: number): 'vermelho' | 'amarelo' | 'verde' {
    if (percentual >= 70) return 'verde'
    if (percentual >= 50) return 'amarelo'
    return 'vermelho'
  }

  static async listarParaUsuario(userId: string): Promise<SimuladoEvento[]> {
    // Buscar IDs dos planos que o usuário tem acesso (próprios + compartilhados)
    const planosUsuario = await prisma.planoEstudo.findMany({
      where: {
        OR: [
          { userId },
          { usuarios: { some: { userId } } }
        ]
      },
      select: { id: true }
    })
    const planoIds = planosUsuario.map(p => p.id)

    // Buscar IDs dos simulados associados a ciclos desses planos
    const semanasComSimulado = await prisma.semanaEstudo.findMany({
      where: {
        planoId: { in: planoIds },
        simuladoId: { not: null }
      },
      select: { simuladoId: true }
    })
    const simuladoIds = semanasComSimulado
      .map(s => s.simuladoId)
      .filter((id): id is string => id !== null)

    if (simuladoIds.length === 0) return []

    const simulados = await prisma.simulado.findMany({
      where: { ativo: true, id: { in: simuladoIds } },
      include: {
        config: {
          select: {
            id: true,
            nome: true,
            totalQuestoes: true,
            disciplinas: {
              include: { disciplina: { select: { id: true, nome: true, cor: true } } },
              orderBy: { disciplina: { nome: 'asc' } }
            }
          }
        },
        resultados: {
          where: { userId },
          include: {
            disciplinas: {
              include: { disciplina: { select: { id: true, nome: true, cor: true } } },
              orderBy: { disciplina: { nome: 'asc' } }
            }
          }
        },
        _count: { select: { resultados: true } }
      },
      orderBy: { dataRealizacao: 'desc' }
    })

    return simulados.map(s => ({
      id: s.id,
      nome: s.nome,
      dataRealizacao: s.dataRealizacao,
      ativo: s.ativo,
      config: s.config
        ? {
            id: s.config.id,
            nome: s.config.nome,
            totalQuestoes: s.config.totalQuestoes,
            disciplinas: s.config.disciplinas.map(d => ({
              disciplinaId: d.disciplinaId,
              totalQuestoes: d.totalQuestoes,
              disciplina: d.disciplina
            }))
          }
        : null,
      totalParticipantes: s._count.resultados,
      meuResultado: s.resultados[0]
        ? {
            id: s.resultados[0].id,
            totalQuestoes: s.resultados[0].totalQuestoes,
            totalAcertos: s.resultados[0].totalAcertos,
            percentualGeral: s.resultados[0].percentualGeral,
            disciplinas: s.resultados[0].disciplinas.map(d => ({
              id: d.id,
              disciplina: d.disciplina,
              totalQuestoes: d.totalQuestoes,
              acertos: d.acertos,
              percentual: d.percentual
            }))
          }
        : null
    }))
  }

  static async listarParaAdmin() {
    return prisma.simulado.findMany({
      include: {
        config: { select: { id: true, nome: true, totalQuestoes: true } },
        _count: { select: { resultados: true } }
      },
      orderBy: { dataRealizacao: 'desc' }
    })
  }
}
