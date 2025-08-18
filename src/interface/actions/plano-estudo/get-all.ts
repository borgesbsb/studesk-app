'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'

export async function getAllPlanosEstudo() {
  try {
    const planos = await PlanoEstudoService.listarPlanos()
    return { success: true, data: planos }
  } catch (error) {
    console.error('Erro ao buscar planos de estudo:', error)
    return { 
      success: false, 
      error: 'Erro ao buscar planos de estudo. Tente novamente.' 
    }
  }
}
