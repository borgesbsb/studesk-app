"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { SimuladoService } from "@/application/services/simulado.service"

export async function getDisciplinasDoSimulado(simuladoId: string) {
  try {
    const { userId } = await requireAuth()

    const simulado = await prisma.simulado.findFirst({
      where: { id: simuladoId, userId },
      include: {
        disciplinas: {
          include: {
            disciplina: { select: { id: true, nome: true, cor: true } }
          },
          orderBy: { disciplina: { nome: 'asc' } }
        }
      }
    })

    if (!simulado) {
      return { success: false, error: "Simulado não encontrado" }
    }

    const disciplinas = simulado.disciplinas.map(d => ({
      id: d.id,
      disciplina: d.disciplina,
      totalQuestoes: d.totalQuestoes,
      acertos: d.acertos,
      percentual: d.percentual,
      statusCor: SimuladoService.getStatusCor(d.percentual)
    }))

    return { success: true, data: disciplinas }
  } catch (error) {
    console.error("Erro ao buscar disciplinas do simulado:", error)
    return { success: false, error: "Erro ao buscar disciplinas do simulado" }
  }
}
