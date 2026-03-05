"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

interface DisciplinaAcerto {
  disciplinaId: string
  totalQuestoes: number
  acertos: number
}

interface RegistrarAcertosData {
  simuladoId: string
  disciplinas: DisciplinaAcerto[]
}

export async function registrarAcertos(data: RegistrarAcertosData) {
  try {
    const { userId } = await requireAuth()

    const totalQuestoes = data.disciplinas.reduce((s, d) => s + d.totalQuestoes, 0)
    const totalAcertos = data.disciplinas.reduce((s, d) => s + d.acertos, 0)
    const percentualGeral = totalQuestoes > 0
      ? Math.round((totalAcertos / totalQuestoes) * 1000) / 10
      : 0

    // Upsert: se já existe resultado para este usuário neste simulado, atualiza
    const resultado = await prisma.simuladoResultado.upsert({
      where: { simuladoId_userId: { simuladoId: data.simuladoId, userId } },
      update: {
        totalQuestoes,
        totalAcertos,
        percentualGeral,
        disciplinas: {
          deleteMany: {},
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
      create: {
        simuladoId: data.simuladoId,
        userId,
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
      }
    })

    return { success: true, data: resultado }
  } catch (error) {
    console.error("[registrarAcertos] Erro:", error)
    return { success: false, error: `Erro ao registrar acertos: ${(error as Error).message}` }
  }
}
