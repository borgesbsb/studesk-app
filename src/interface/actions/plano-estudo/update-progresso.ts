'use server'

import { PlanoEstudoService, UpdateProgressoData } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export async function updateProgressoEstudo(data: UpdateProgressoData) {
  try {
    const { userId } = await requireAuth()
    console.log('🔄 ACTION: Dados recebidos para atualização:', data) // Debug
    const resultado = await PlanoEstudoService.atualizarProgresso(userId, data)
    console.log('✅ ACTION: Resultado do service:', resultado) // Debug
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('❌ ACTION: Erro ao atualizar progresso:', error)
    console.error('❌ ACTION: Stack trace:', (error as Error).stack)
    return {
      success: false,
      error: `Erro ao atualizar progresso: ${(error as Error).message}`
    }
  }
}
