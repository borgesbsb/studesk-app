"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function deletarSimulado(simuladoId: string) {
  try {
    const { userId } = await requireAuth()

    // Verificar se o simulado pertence ao usuário
    const simulado = await prisma.simulado.findFirst({
      where: {
        id: simuladoId,
        userId
      }
    })

    if (!simulado) {
      return {
        success: false,
        error: "Simulado não encontrado"
      }
    }

    // Deletar simulado (cascade vai deletar disciplinas e questões)
    await prisma.simulado.delete({
      where: { id: simuladoId }
    })

    console.log(`[Simulado] Simulado ${simuladoId} deletado com sucesso`)

    return {
      success: true,
      message: "Simulado deletado com sucesso"
    }
  } catch (error) {
    console.error("Erro ao deletar simulado:", error)
    return {
      success: false,
      error: "Erro ao deletar simulado: " + (error as Error).message
    }
  }
}
