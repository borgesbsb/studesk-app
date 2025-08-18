'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { revalidatePath } from "next/cache"

export async function adicionarMaterialADisciplina(disciplinaId: string, materialId: string) {
  try {
    const relacao = await MaterialEstudoService.adicionarMaterialADisciplina(disciplinaId, materialId)
    revalidatePath('/disciplina')
    return { success: true, data: relacao }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar material à disciplina'
    }
  }
}

export async function removerMaterialDaDisciplina(disciplinaId: string, materialId: string) {
  try {
    await MaterialEstudoService.removerMaterialDaDisciplina(disciplinaId, materialId)
    revalidatePath('/disciplina')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao remover material da disciplina'
    }
  }
}

export async function listarMateriaisDaDisciplina(disciplinaId: string) {
  try {
    const materiais = await MaterialEstudoService.listarMateriaisDaDisciplina(disciplinaId)
    return { success: true, data: materiais }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar materiais da disciplina'
    }
  }
} 