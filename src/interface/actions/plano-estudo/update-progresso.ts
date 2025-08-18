'use server'

import { PlanoEstudoService, UpdateProgressoData } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

export async function updateProgressoEstudo(data: UpdateProgressoData) {
  try {
    const resultado = await PlanoEstudoService.atualizarProgresso(data)
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return { 
      success: false, 
      error: 'Erro ao atualizar progresso. Tente novamente.' 
    }
  }
}
