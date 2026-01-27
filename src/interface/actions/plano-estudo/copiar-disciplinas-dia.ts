'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

interface CopiarDisciplinasDiaData {
  semanaId: string
  diaOrigem: string
  diaDestino: string
}

export async function copiarDisciplinasDia(data: CopiarDisciplinasDiaData) {
  try {
    const { userId } = await requireAuth()

    console.log('🔄 ACTION: Iniciando cópia de disciplinas de um dia para outro')
    console.log('📅 Dia origem:', data.diaOrigem)
    console.log('📅 Dia destino:', data.diaDestino)
    console.log('📚 Semana:', data.semanaId)
    console.log('👤 User ID:', userId)

    const resultado = await PlanoEstudoService.copiarDisciplinasDia(userId, data)

    console.log('✅ ACTION: Disciplinas copiadas com sucesso:', JSON.stringify(resultado, null, 2))
    revalidatePath('/plano-estudos')

    return {
      success: true,
      data: resultado,
      message: `${resultado.disciplinasCriadas} disciplina(s) copiada(s) com sucesso!`
    }
  } catch (error) {
    console.error('❌ ACTION: Erro ao copiar disciplinas:', error)
    console.error('Stack trace:', (error as Error).stack)
    return {
      success: false,
      error: `Erro ao copiar disciplinas: ${(error as Error).message}`
    }
  }
}
