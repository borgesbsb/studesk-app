"use server"

import { ConcursoService } from "@/application/services/concurso.service"

export async function buscarConcursoPorId(id: string) {
  try {
    const concurso = await ConcursoService.buscarConcursoPorId(id)
    if (!concurso) {
      return { success: false, error: "Concurso não encontrado" }
    }
    return { 
      success: true, 
      data: {
        ...concurso,
        dataProva: concurso.dataProva?.toISOString() || null
      }
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 