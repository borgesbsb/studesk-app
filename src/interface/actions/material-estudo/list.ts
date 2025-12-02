'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"
import { requireAuth } from "@/lib/auth-helpers"

export async function listarMateriaisEstudo() {
  try {
    const { userId } = await requireAuth()
    const materiais = await MaterialEstudoService.listarMateriaisEstudo(userId)
    return { success: true, data: materiais }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao listar materiais de estudo'
    }
  }
}

export async function buscarMaterialEstudoPorId(id: string) {
  try {
    const { userId } = await requireAuth()
    const material = await MaterialEstudoService.buscarMaterialEstudoPorId(userId, id)
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar material de estudo'
    }
  }
} 