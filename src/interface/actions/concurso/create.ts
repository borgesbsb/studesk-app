"use server"

import { ConcursoService } from "@/application/services/concurso.service"

export interface CreateConcursoData {
  nome: string
  orgao: string
  banca: string
  cargo: string
  editalUrl?: string
  imagemUrl?: string
  dataProva?: string
  inicioCurso?: string
}

export async function criarConcurso(data: CreateConcursoData) {
  try {
    const concurso = await ConcursoService.criarConcurso({
      ...data,
      dataProva: data.dataProva ? new Date(data.dataProva) : undefined,
      inicioCurso: data.inicioCurso ? new Date(data.inicioCurso) : undefined,
    })
    return { success: true, data: concurso }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 