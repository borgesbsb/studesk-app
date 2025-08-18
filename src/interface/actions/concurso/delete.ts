"use server"

import { ConcursoService } from "@/application/services/concurso.service"

export async function deletarConcurso(id: string) {
  try {
    await ConcursoService.deletarConcurso(id)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 