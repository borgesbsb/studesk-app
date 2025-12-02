"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"
import { requireAuth } from "@/lib/auth-helpers"

export interface UpdateDisciplinaData {
  nome?: string
  descricao?: string
  cargaHoraria?: number
  peso?: number
}

export async function atualizarDisciplina(id: string, data: UpdateDisciplinaData) {
  try {
    const { userId } = await requireAuth()
    const disciplina = await DisciplinaService.atualizarDisciplina(userId, id, data)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 