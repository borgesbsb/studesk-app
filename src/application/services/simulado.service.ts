import { prisma } from "@/lib/prisma"

export interface SimuladoComMetrics {
  id: string
  nome: string
  dataRealizacao: Date
  totalQuestoes: number
  totalAcertos: number
  percentualGeral: number
  totalDisciplinas: number
  config: {
    id: string
    nome: string
  } | null
  disciplinas: {
    id: string
    disciplina: { id: string; nome: string; cor: string | null }
    totalQuestoes: number
    acertos: number
    percentual: number
  }[]
}

export class SimuladoService {
  static async listarSimulados(userId: string): Promise<SimuladoComMetrics[]> {
    const simulados = await prisma.simulado.findMany({
      where: { userId },
      include: {
        config: { select: { id: true, nome: true } },
        disciplinas: {
          include: {
            disciplina: { select: { id: true, nome: true, cor: true } }
          },
          orderBy: { disciplina: { nome: 'asc' } }
        }
      },
      orderBy: { dataRealizacao: 'desc' }
    })

    return simulados.map(s => ({
      id: s.id,
      nome: s.nome,
      dataRealizacao: s.dataRealizacao,
      totalQuestoes: s.totalQuestoes,
      totalAcertos: s.totalAcertos,
      percentualGeral: s.percentualGeral,
      totalDisciplinas: s.disciplinas.length,
      config: s.config,
      disciplinas: s.disciplinas.map(d => ({
        id: d.id,
        disciplina: d.disciplina,
        totalQuestoes: d.totalQuestoes,
        acertos: d.acertos,
        percentual: d.percentual
      }))
    }))
  }

  static getStatusCor(percentual: number): 'vermelho' | 'amarelo' | 'verde' {
    if (percentual >= 70) return 'verde'
    if (percentual >= 50) return 'amarelo'
    return 'vermelho'
  }
}
