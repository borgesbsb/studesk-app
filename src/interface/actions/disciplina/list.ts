"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"

export async function listarDisciplinas() {
  try {
    const disciplinas = await DisciplinaService.listarDisciplinas()
    return { success: true, data: disciplinas }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function buscarDisciplinaPorId(id: string) {
  try {
    const disciplina = await DisciplinaService.buscarDisciplinaPorId(id)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 