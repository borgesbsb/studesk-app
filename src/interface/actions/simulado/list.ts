"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { SimuladoService } from "@/application/services/simulado.service"

export async function listarSimulados() {
  try {
    const { userId } = await requireAuth()

    const simulados = await SimuladoService.listarSimulados(userId)

    return {
      success: true,
      data: simulados
    }
  } catch (error) {
    console.error("Erro ao listar simulados:", error)
    return {
      success: false,
      error: "Erro ao listar simulados"
    }
  }
}
