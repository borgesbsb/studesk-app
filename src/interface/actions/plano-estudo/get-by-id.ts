'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'

export async function getPlanoEstudoById(id: string) {
  try {
    const plano = await PlanoEstudoService.buscarPorId(id)
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao buscar plano de estudo:', error)
    return { 
      success: false, 
      error: 'Erro ao buscar plano de estudo. Tente novamente.' 
    }
  }
}
