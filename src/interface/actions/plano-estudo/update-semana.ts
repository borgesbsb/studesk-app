'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

interface UpdateSemanaData {
  semanaId: string
  dataInicio?: string
  dataFim?: string
}

export async function updateSemanaEstudo(data: UpdateSemanaData) {
  try {
    console.log('🔄 ACTION: Atualizando datas da semana:', data)
    
    const resultado = await PlanoEstudoService.atualizarSemana(data)
    
    console.log('✅ ACTION: Semana atualizada com sucesso:', resultado)
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('❌ ACTION: Erro ao atualizar semana:', error)
    return { 
      success: false, 
      error: `Erro ao atualizar semana: ${(error as Error).message}` 
    }
  }
}