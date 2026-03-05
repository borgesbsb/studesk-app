"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function deletarResultado(resultadoId: string) {
  try {
    const { userId } = await requireAuth()

    const resultado = await prisma.simuladoResultado.findFirst({
      where: { id: resultadoId, userId }
    })

    if (!resultado) {
      return { success: false, error: "Resultado não encontrado" }
    }

    await prisma.simuladoResultado.delete({ where: { id: resultadoId } })

    return { success: true }
  } catch (error) {
    console.error("Erro ao deletar resultado:", error)
    return { success: false, error: "Erro ao deletar resultado: " + (error as Error).message }
  }
}
