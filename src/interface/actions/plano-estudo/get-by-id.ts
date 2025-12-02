'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { requireAuth } from '@/lib/auth-helpers'

export async function getPlanoEstudoById(id: string) {
  try {
    const { userId } = await requireAuth()
    const plano = await PlanoEstudoService.buscarPorId(userId, id)
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao buscar plano de estudo:', error)
    return {
      success: false,
      error: 'Erro ao buscar plano de estudo. Tente novamente.'
    }
  }
}
