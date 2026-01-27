'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

interface AdicionarDisciplinaData {
  semanaId: string
  disciplinaId: string
  horasPlanejadas?: number
  questoesPlanejadas?: number
  diasEstudo?: string
  tipoVeiculo?: string
  materialNome?: string
  tempoVideoPlanejado?: number
  parametro?: string
}

export async function adicionarDisciplinaSemana(data: AdicionarDisciplinaData) {
  try {
    const { userId } = await requireAuth()

    const resultado = await PlanoEstudoService.adicionarDisciplinaSemana(userId, {
      semanaId: data.semanaId,
      disciplinaId: data.disciplinaId,
      horasPlanejadas: data.horasPlanejadas || 1,
      questoesPlanejadas: data.questoesPlanejadas || 0,
      diasEstudo: data.diasEstudo || '',
      tipoVeiculo: data.tipoVeiculo,
      materialNome: data.materialNome,
      tempoVideoPlanejado: data.tempoVideoPlanejado,
      parametro: data.parametro
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