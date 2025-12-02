'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export async function deletePlanoEstudo(id: string) {
  try {
    const { userId } = await requireAuth()
    await PlanoEstudoService.excluir(userId, id)
    revalidatePath('/plano-estudos')
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir plano de estudo:', error)
    return {
      success: false,
      error: 'Erro ao excluir plano de estudo. Tente novamente.'
    }
  }
}
