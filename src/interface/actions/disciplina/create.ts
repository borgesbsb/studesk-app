"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"
import { requireAuth } from "@/lib/auth-helpers"

export interface CreateDisciplinaData {
  nome: string
  descricao?: string
  cargaHoraria?: number
  peso?: number
  cor?: string
}

export async function criarDisciplina(data: CreateDisciplinaData) {
  try {
    const { userId } = await requireAuth()
    // Adicionar valores padrão se não fornecidos
    const disciplinaData = {
      ...data,
      cargaHoraria: data.cargaHoraria ?? 0,
      peso: data.peso ?? 1.0,
    }
    const disciplina = await DisciplinaService.criarDisciplina(userId, disciplinaData)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 