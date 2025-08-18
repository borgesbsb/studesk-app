'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { UpdateMaterialEstudoDTO } from "@/domain/entities/MaterialEstudo"
import { revalidatePath } from "next/cache"

export async function atualizarMaterialEstudo(id: string, data: UpdateMaterialEstudoDTO) {
  try {
    const material = await MaterialEstudoService.atualizarMaterialEstudo(id, data)
    revalidatePath('/disciplina')
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar material de estudo'
    }
  }
}

export async function atualizarProgressoLeitura(id: string, paginasLidas: number) {
  try {
    const material = await MaterialEstudoService.atualizarProgressoLeitura(id, paginasLidas)
    revalidatePath('/disciplina')
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar progresso de leitura'
    }
  }
} 