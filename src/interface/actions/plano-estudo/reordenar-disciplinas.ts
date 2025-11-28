'use server'

import { prisma } from '@/lib/prisma'

export async function reordenarDisciplinas(disciplinaIds: string[]) {
  try {
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