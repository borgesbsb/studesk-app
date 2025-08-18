"use server"

import { DisciplinaService } from "@/application/services/disciplina.service"

export interface CreateDisciplinaData {
  nome: string
  descricao?: string
  cargaHoraria: number
  peso: number
}

export async function criarDisciplina(data: CreateDisciplinaData) {
  try {
    const disciplina = await DisciplinaService.criarDisciplina(data)
    return { success: true, data: disciplina }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
} 