'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

interface UpdateProgressParams {
  materialId: string
  paginasLidas: number[]
}

export async function atualizarProgressoMaterial({
  materialId,
  paginasLidas,
}: UpdateProgressParams) {
  try {
    const material = await prisma.materialEstudo.update({
      where: {
        id: materialId,
      },
      data: {
        paginasLidas: paginasLidas.length,
        updatedAt: new Date(),
      },
    })

    revalidatePath('/materiais')
    revalidatePath(`/materiais/${materialId}`)

    return {
      success: true,
      material,
    }
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error)
    return {
      success: false,
      error: 'Erro ao atualizar progresso do material',
    }
  }
} 