'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { revalidatePath } from "next/cache"

export async function deletarMaterialEstudo(id: string) {
  try {
    await MaterialEstudoService.deletarMaterialEstudo(id)
    revalidatePath('/disciplina')
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao deletar material de estudo'
    }
  }
} 