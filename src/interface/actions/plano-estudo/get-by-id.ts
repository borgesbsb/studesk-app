'use server'

import { PlanoEstudoService } from '@/application/services/plano-estudo.service'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

const planoInclude = {
  semanas: {
    include: {
      disciplinas: {
        include: {
          disciplina: true,
          dias: { orderBy: { dia: 'asc' as const } }
        },
        orderBy: { prioridade: 'asc' as const }
      }
    },
    orderBy: { numeroSemana: 'asc' as const }
  }
}

export async function getPlanoEstudoById(id: string) {
  try {
    const { userId } = await requireAuth()

    // Plano pessoal
    const plano = await PlanoEstudoService.buscarPorId(userId, id)
    if (plano) return { success: true, data: plano }

    // Plano compartilhado (admin)
    const atribuicao = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId: id, userId } },
      include: { plano: { include: planoInclude } }
    })
    if (atribuicao) return { success: true, data: atribuicao.plano }

    return { success: true, data: null }
  } catch (error) {
    console.error('Erro ao buscar plano de estudo:', error)
    return {
      success: false,
      error: 'Erro ao buscar plano de estudo. Tente novamente.'
    }
  }
}

// Detecta se o plano é compartilhado (admin) ou pessoal
// Retorna: { isShared: true } se atribuído | { isShared: false } se próprio | null se sem acesso
export async function detectarTipoPlano(planoId: string): Promise<{ isShared: boolean } | null> {
  try {
    const { userId } = await requireAuth()

    // Verifica se é plano atribuído (compartilhado)
    const atribuicao = await prisma.planoEstudoUsuario.findUnique({
      where: { planoId_userId: { planoId, userId } }
    })
    if (atribuicao) return { isShared: true }

    // Verifica se é plano próprio
    const plano = await prisma.planoEstudo.findFirst({
      where: { id: planoId, userId }
    })
    if (plano) return { isShared: false }

    return null
  } catch {
    return null
  }
}
