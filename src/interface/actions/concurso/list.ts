"use server"

import { ConcursoService } from "@/application/services/concurso.service"

export async function listarConcursos() {
  try {
    const concursos = await ConcursoService.listarConcursos()
    return { 
      success: true, 
      data: concursos.map(concurso => ({
        ...concurso,
        dataProva: concurso.dataProva?.toISOString() || null
      }))
    }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 