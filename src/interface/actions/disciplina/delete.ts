"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function deletarDisciplina(id: string) {
  try {
    const { userId } = await requireAuth()
    await DisciplinaService.deletarDisciplina(userId, id)
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 