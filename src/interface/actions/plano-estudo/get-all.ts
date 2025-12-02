'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { requireAuth } from '@/lib/auth-helpers'

export async function getAllPlanosEstudo() {
  try {
    const { userId } = await requireAuth()
    const planos = await PlanoEstudoService.listarPlanos(userId)
    return { success: true, data: planos }
  } catch (error) {
    console.error('Erro ao buscar planos de estudo:', error)
    return {
      success: false,
      error: 'Erro ao buscar planos de estudo. Tente novamente.'
    }
  }
}
