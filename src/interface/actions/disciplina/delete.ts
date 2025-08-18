"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"

export async function deletarDisciplina(id: string) {
  try {
    await DisciplinaService.deletarDisciplina(id)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 