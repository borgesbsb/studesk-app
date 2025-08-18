'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

export async function deletePlanoEstudo(id: string) {
  try {
    await PlanoEstudoService.excluir(id)
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
