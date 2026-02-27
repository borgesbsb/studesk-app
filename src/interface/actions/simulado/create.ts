"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

interface DisciplinaAcerto {
  disciplinaId: string
  totalQuestoes: number
  acertos: number
}

interface CreateSimuladoData {
  nome: string
  configSimuladoId?: string
  semanaEstudoId?: string
  dataRealizacao: Date
  disciplinas: DisciplinaAcerto[]
}

export async function criarSimulado(data: CreateSimuladoData) {
  try {
    const { userId } = await requireAuth()

    const totalQuestoes = data.disciplinas.reduce((sum, d) => sum + d.totalQuestoes, 0)
    const totalAcertos = data.disciplinas.reduce((sum, d) => sum + d.acertos, 0)
    const percentualGeral = totalQuestoes > 0
      ? Math.round((totalAcertos / totalQuestoes) * 1000) / 10
      : 0

    const simulado = await prisma.simulado.create({
      data: {
        userId,
        nome: data.nome,
        configSimuladoId: data.configSimuladoId || null,
        semanaEstudoId: data.semanaEstudoId || null,
        dataRealizacao: data.dataRealizacao,
        totalQuestoes,
        totalAcertos,
        percentualGeral,
        disciplinas: {
          create: data.disciplinas.map(d => ({
            disciplinaId: d.disciplinaId,
            totalQuestoes: d.totalQuestoes,
            acertos: d.acertos,
            percentual: d.totalQuestoes > 0
              ? Math.round((d.acertos / d.totalQuestoes) * 1000) / 10
              : 0
          }))
        }
      },
      include: {
        disciplinas: { include: { disciplina: true } }
      }
    })

    return { success: true, data: simulado }
  } catch (error) {
    console.error("[criarSimulado] Erro:", error)
    return {
      success: false,
      error: `Erro ao criar simulado: ${(error as Error).message}`
    }
  }
}
