'use server'

import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth-helpers'

const prisma = new PrismaClient()

export async function deleteCiclo(cicloId: string, planoId: string) {
  try {
    const { userId } = await requireAuth()

    // Verifica se o plano pertence ao usuário
    const plano = await prisma.planoEstudo.findUnique({
      where: { id: planoId, userId }
    })

    if (!plano) {
      return {
        success: false,
        error: 'Plano não encontrado ou sem permissão'
      }
    }

    // Buscar o ciclo a ser excluído
    const cicloParaExcluir = await prisma.semanaEstudo.findUnique({
      where: { id: cicloId },
      select: { numeroSemana: true, planoId: true }
    })

    if (!cicloParaExcluir) {
      return {
        success: false,
        error: 'Ciclo não encontrado'
      }
    }

    if (cicloParaExcluir.planoId !== planoId) {
      return {
        success: false,
        error: 'Ciclo não pertence a este plano'
      }
    }

    // Verificar se não é o último ciclo
    const totalCiclos = await prisma.semanaEstudo.count({
      where: { planoId }
    })

    if (totalCiclos <= 1) {
      return {
        success: false,
        error: 'Não é possível excluir o último ciclo do plano'
      }
    }

    // Excluir o ciclo (disciplinas são excluídas por cascade)
    await prisma.semanaEstudo.delete({
      where: { id: cicloId }
    })

    // Renumerar os ciclos posteriores
    const ciclosPosteriores = await prisma.semanaEstudo.findMany({
      where: {
        planoId,
        numeroSemana: { gt: cicloParaExcluir.numeroSemana }
      },
      orderBy: { numeroSemana: 'asc' }
    })

    // Atualizar numeração dos ciclos posteriores
    for (const ciclo of ciclosPosteriores) {
      await prisma.semanaEstudo.update({
        where: { id: ciclo.id },
        data: { numeroSemana: ciclo.numeroSemana - 1 }
      })
    }

    revalidatePath(`/plano-estudos/${planoId}`)
    return { success: true }
  } catch (error) {
    console.error('Erro ao excluir ciclo:', error)
    return {
      success: false,
      error: 'Erro interno. Tente novamente.'
    }
  }
}