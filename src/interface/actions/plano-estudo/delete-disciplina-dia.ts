'use server'

import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function deleteDisciplinaDia(disciplinaDiaId: string) {
  try {
    const { userId } = await requireAuth()

    console.log('🗑️ ACTION: Deletando DisciplinaDia:', disciplinaDiaId)

    // Verificar se o DisciplinaDia pertence ao usuário
    const disciplinaDia = await prisma.disciplinaDia.findUnique({
      where: { id: disciplinaDiaId },
      include: {
        disciplinaSemana: {
          include: {
            semana: {
              include: {
                plano: true
              }
            }
          }
        }
      }
    })

    if (!disciplinaDia || disciplinaDia.disciplinaSemana.semana.plano.userId !== userId) {
      throw new Error('DisciplinaDia não encontrado ou sem permissão')
    }

    // Deletar o DisciplinaDia
    await prisma.disciplinaDia.delete({
      where: { id: disciplinaDiaId }
    })

    console.log('✅ ACTION: DisciplinaDia deletado com sucesso')
    revalidatePath('/plano-estudos')

    return { success: true }
  } catch (error) {
    console.error('❌ ACTION: Erro ao deletar DisciplinaDia:', error)
    return {
      success: false,
      error: `Erro ao deletar: ${(error as Error).message}`
    }
  }
}
