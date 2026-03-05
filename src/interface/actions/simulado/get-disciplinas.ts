"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { SimuladoService } from "@/application/services/simulado.service"

export async function getDisciplinasDoSimulado(simuladoId: string) {
  try {
    const { userId } = await requireAuth()

    const resultado = await prisma.simuladoResultado.findUnique({
      where: { simuladoId_userId: { simuladoId, userId } },
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } },
          orderBy: { disciplina: { nome: 'asc' } }
        }
      }
    })

    if (!resultado) return { success: false, error: "Resultado não encontrado" }

    return {
      success: true,
      data: resultado.disciplinas.map(d => ({
        id: d.id,
        disciplina: d.disciplina,
        totalQuestoes: d.totalQuestoes,
        acertos: d.acertos,
        percentual: d.percentual,
        statusCor: SimuladoService.getStatusCor(d.percentual)
      }))
    }
  } catch (error) {
    console.error("Erro ao buscar disciplinas:", error)
    return { success: false, error: "Erro ao buscar disciplinas" }
  }
}
