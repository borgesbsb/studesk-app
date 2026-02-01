"use server"

import { requireAuth } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

interface CreateSimuladoData {
  nome: string
  descricao?: string
  semanaEstudoId?: string
  dataRealizacao: Date
}

export async function criarSimulado(data: CreateSimuladoData) {
  try {
    const { userId } = await requireAuth()

    console.log('[criarSimulado] Dados recebidos:', data)
    console.log('[criarSimulado] User ID:', userId)

    const simulado = await prisma.simulado.create({
      data: {
        userId,
        nome: data.nome,
        descricao: data.descricao,
        semanaEstudoId: data.semanaEstudoId,
        dataRealizacao: data.dataRealizacao,
        status: "em_andamento"
      }
    })

    console.log('[criarSimulado] Simulado criado:', simulado)

    return {
      success: true,
      data: simulado
    }
  } catch (error) {
    console.error("[criarSimulado] Erro completo:", error)
    console.error("[criarSimulado] Error message:", (error as Error).message)
    console.error("[criarSimulado] Error stack:", (error as Error).stack)
    return {
      success: false,
      error: `Erro ao criar simulado: ${(error as Error).message}`
    }
  }
}
