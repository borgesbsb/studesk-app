'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-helpers"

export async function deletarMaterialEstudo(id: string) {
  try {
    const { userId } = await requireAuth()
    await MaterialEstudoService.deletarMaterialEstudo(userId, id)
    revalidatePath('/disciplina')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar material de estudo'
    }
  }
}

export async function deletarMateriaisEmMassa(ids: string[]) {
  try {
    if (!ids.length) return { success: false, error: 'Nenhum material selecionado' }
    const { userId } = await requireAuth()
    await MaterialEstudoService.deletarMateriaisEmMassa(userId, ids)
    revalidatePath('/disciplina')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar materiais'
    }
  }
} 