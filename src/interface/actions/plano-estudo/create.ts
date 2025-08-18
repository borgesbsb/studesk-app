'use server'

import { PlanoEstudoService, CreatePlanoEstudoData } from '@/application/services/plano-estudo.service'
import { revalidatePath } from 'next/cache'

export async function createPlanoEstudo(data: CreatePlanoEstudoData) {
  try {
    const plano = await PlanoEstudoService.criar(data)
    revalidatePath('/plano-estudos')
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao criar plano de estudo:', error)
    return { 
      success: false, 
      error: 'Erro ao criar plano de estudo. Tente novamente.' 
    }
  }
}

export async function createPlanoEstudoSimples(data: { nome: string; concursoId?: string }) {
  try {
    const plano = await PlanoEstudoService.criarSimples(data)
    revalidatePath('/plano-estudos')
    return { success: true, data: plano }
  } catch (error) {
    console.error('Erro ao criar plano de estudo simples:', error)
    return { 
      success: false, 
      error: 'Erro ao criar plano de estudo. Tente novamente.' 
    }
  }
}
