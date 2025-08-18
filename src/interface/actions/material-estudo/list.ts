'use server'

import { MaterialEstudoService } from "@/application/services/material-estudo.service"

export async function listarMateriaisEstudo() {
  try {
    const materiais = await MaterialEstudoService.listarMateriaisEstudo()
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
    const material = await MaterialEstudoService.buscarMaterialEstudoPorId(id)
    return { success: true, data: material }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao buscar material de estudo'
    }
  }
} 