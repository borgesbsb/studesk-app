"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function listarDisciplinas() {
  try {
    const { userId } = await requireAuth()
    const disciplinas = await DisciplinaService.listarDisciplinas(userId)
    return { success: true, data: disciplinas }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function buscarDisciplinaPorId(id: string) {
  try {
    const { userId } = await requireAuth()
    const disciplina = await DisciplinaService.buscarDisciplinaPorId(userId, id)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 