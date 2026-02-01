"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

export async function getAllSemanasEstudo() {
  try {
    const { userId } = await requireAuth()

    const semanas = await prisma.semanaEstudo.findMany({
      where: {
        plano: {
          userId
        }
      },
      include: {
        plano: {
          select: {
            id: true,
            nome: true
          }
        }
      },
      orderBy: [
        { plano: { nome: 'asc' } },
        { numeroSemana: 'asc' }
      ]
    })

    return {
      success: true,
      data: semanas
    }
  } catch (error) {
    console.error("Erro ao buscar semanas de estudo:", error)
    return {
      success: false,
      error: "Erro ao buscar semanas de estudo"
    }
  }
}
