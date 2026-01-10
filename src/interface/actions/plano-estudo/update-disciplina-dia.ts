'use server'

import { PlanoEstudoService, UpdateDisciplinaDiaData } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

export async function updateDisciplinaDia(data: UpdateDisciplinaDiaData) {
  try {
    const { userId } = await requireAuth()
    console.log('🔄 ACTION: Atualizando DisciplinaDia:', data)

    const resultado = await PlanoEstudoService.atualizarDisciplinaDia(userId, data)

    console.log('✅ ACTION: DisciplinaDia atualizada com sucesso')
    revalidatePath('/plano-estudos')

    return { success: true, data: resultado }
  } catch (error) {
    console.error('❌ ACTION: Erro ao atualizar DisciplinaDia:', error)
    return {
      success: false,
      error: `Erro ao atualizar: ${(error as Error).message}`
    }
  }
}
