"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"

export interface UpdateDisciplinaData {
  nome?: string
  descricao?: string
  cargaHoraria?: number
  peso?: number
}

export async function atualizarDisciplina(id: string, data: UpdateDisciplinaData) {
  try {
    const disciplina = await DisciplinaService.atualizarDisciplina(id, data)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 