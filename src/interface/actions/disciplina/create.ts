"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"
import { requireAuth } from "@/lib/auth-helpers"

export interface CreateDisciplinaData {
  nome: string
  descricao?: string
  cargaHoraria: number
  peso: number
}

export async function criarDisciplina(data: CreateDisciplinaData) {
  try {
    const { userId } = await requireAuth()
    const disciplina = await DisciplinaService.criarDisciplina(userId, data)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 