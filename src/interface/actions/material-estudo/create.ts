'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { CreateMaterialEstudoDTO } from "@/domain/entities/MaterialEstudo"
import { revalidatePath } from "next/cache"

export async function criarMaterialEstudo(data: CreateMaterialEstudoDTO) {
  try {
    const material = await MaterialEstudoService.criarMaterialEstudo(data)
    revalidatePath('/disciplina')
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar material de estudo'
    }
  }
} 