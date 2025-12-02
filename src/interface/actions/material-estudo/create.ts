'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { CreateMaterialEstudoDTO } from "@/domain/entities/MaterialEstudo"
import { revalidatePath } from "next/cache"
import { requireAuth } from "@/lib/auth-helpers"

export async function criarMaterialEstudo(data: CreateMaterialEstudoDTO) {
  try {
    const { userId } = await requireAuth()
    const material = await MaterialEstudoService.criarMaterialEstudo(userId, data)
    revalidatePath('/disciplina')
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar material de estudo'
    }
  }
} 