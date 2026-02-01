"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { SimuladoService } from "@/application/services/simulado.service"

export async function getDisciplinasDoSimulado(simuladoId: string) {
  try {
    const { userId } = await requireAuth()

    const disciplinas = await SimuladoService.listarDisciplinasDoSimulado(simuladoId, userId)

    if (!disciplinas) {
      return {
        success: false,
        error: "Simulado não encontrado"
      }
    }

    return {
      success: true,
      data: disciplinas
    }
  } catch (error) {
    console.error("Erro ao buscar disciplinas do simulado:", error)
    return {
      success: false,
      error: "Erro ao buscar disciplinas do simulado"
    }
  }
}
