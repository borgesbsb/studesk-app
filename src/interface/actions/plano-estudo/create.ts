'use server'

import { PlanoEstudoService, CreatePlanoEstudoData } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export async function createPlanoEstudo(data: CreatePlanoEstudoData) {
  try {
    const { userId } = await requireAuth()
    const plano = await PlanoEstudoService.criar(userId, data)
    revalidatePath('/plano-estudos')
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao criar plano de estudo:', error)
    return {
      success: false,
      error: 'Erro ao criar plano de estudo. Tente novamente.'
    }
  }
}

export async function createPlanoEstudoSimples(data: { nome: string }) {
  try {
    const { userId } = await requireAuth()
    const plano = await PlanoEstudoService.criarSimples(userId, data)
    revalidatePath('/plano-estudos')
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao criar plano de estudo simples:', error)
    return {
      success: false,
      error: 'Erro ao criar plano de estudo. Tente novamente.'
    }
  }
}
