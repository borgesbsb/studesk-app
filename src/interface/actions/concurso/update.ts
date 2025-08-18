"use server"

import { ConcursoService } from "@/application/services/concurso.service"
import { revalidateTag } from "next/cache"

export interface UpdateConcursoData {
  nome?: string
  orgao?: string
  banca?: string
  cargo?: string
  editalUrl?: string
  dataProva?: string
  inicioCurso?: string
}

export async function atualizarConcurso(id: string, data: UpdateConcursoData) {
  try {
    const concurso = await ConcursoService.atualizarConcurso(id, {
      ...data,
      dataProva: data.dataProva ? new Date(data.dataProva) : undefined,
      inicioCurso: data.inicioCurso ? new Date(data.inicioCurso) : undefined,
    })
    
    // Revalidar usando tags
    revalidateTag("concursos")
    
    return { success: true, data: concurso }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 