'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export interface UpdatePlanoEstudoData {
  nome?: string
  descricao?: string
  dataInicio?: Date
  dataFim?: Date
}

export async function updatePlanoEstudo(id: string, data: UpdatePlanoEstudoData) {
  try {
    const { userId } = await requireAuth()
    const plano = await PlanoEstudoService.atualizar(userId, id, data)
    revalidatePath('/plano-estudos')
    revalidatePath(`/plano-estudos/${id}`)
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao atualizar plano de estudo:', error)
    return {
      success: false,
      error: 'Erro ao atualizar plano de estudo. Tente novamente.'
    }
  }
}
