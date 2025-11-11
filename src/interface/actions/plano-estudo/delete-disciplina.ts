'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

export async function deleteDisciplinaSemana(disciplinaSemanaId: string) {
  try {
    console.log('🔄 ACTION: Excluindo disciplina da semana:', disciplinaSemanaId)
    
    const resultado = await PlanoEstudoService.excluirDisciplinaSemana(disciplinaSemanaId)
    
    console.log('✅ ACTION: Disciplina excluída com sucesso:', resultado)
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('❌ ACTION: Erro ao excluir disciplina:', error)
    return { 
      success: false, 
      error: `Erro ao excluir disciplina: ${(error as Error).message}` 
    }
  }
}