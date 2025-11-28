'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

interface AdicionarDisciplinaData {
  semanaId: string
  disciplinaId: string
  horasPlanejadas?: number
  questoesPlanejadas?: number
  diasEstudo?: string
}

export async function adicionarDisciplinaSemana(data: AdicionarDisciplinaData) {
  try {
    console.log('🔄 ACTION: Adicionando nova disciplina à semana:', data)
    
    const resultado = await PlanoEstudoService.adicionarDisciplinaSemana({
      semanaId: data.semanaId,
      disciplinaId: data.disciplinaId,
      horasPlanejadas: data.horasPlanejadas || 1,
      questoesPlanejadas: data.questoesPlanejadas || 0,
      diasEstudo: data.diasEstudo || '[]'
    })
    
    console.log('✅ ACTION: Disciplina adicionada com sucesso:', resultado)
    revalidatePath('/plano-estudos')
    return { success: true, data: resultado }
  } catch (error) {
    console.error('❌ ACTION: Erro ao adicionar disciplina:', error)
    return { 
      success: false, 
      error: `Erro ao adicionar disciplina: ${(error as Error).message}` 
    }
  }
}