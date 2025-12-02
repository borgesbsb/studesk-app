'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export async function reordenarDisciplinas(disciplinaIds: string[]) {
  try {
    const { userId } = await requireAuth()

    // Validar que todas as disciplinas pertencem a planos do usuário
    if (disciplinaIds.length > 0) {
      const primeiraDisc = await prisma.disciplinaSemana.findUnique({
        where: { id: disciplinaIds[0] },
        include: {
          semana: {
            include: {
              plano: true
            }
          }
        }
      })

      if (!primeiraDisc || primeiraDisc.semana.plano.userId !== userId) {
        return {
          success: false,
          error: 'Disciplinas não encontradas ou sem permissão'
        }
      }
    }

    // Atualizar as prioridades de acordo com a nova ordem
    const updates = disciplinaIds.map((disciplinaId, index) =>
      prisma.disciplinaSemana.update({
        where: { id: disciplinaId },
        data: { prioridade: index + 1 }
      })
    )

    await prisma.$transaction(updates)

    return { success: true }
  } catch (error) {
    console.error('Erro ao reordenar disciplinas:', error)
    return {
      success: false,
      error: 'Erro ao atualizar ordem das disciplinas'
    }
  }
}