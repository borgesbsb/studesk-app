"use server"

import { requireAdminAuth } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

export interface ConfigDisciplinaInput {
  disciplinaId: string
  totalQuestoes: number
}

export async function listarConfigs() {
  try {
    await requireAdminAuth()
    const configs = await prisma.configSimulado.findMany({
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true } } },
          orderBy: { disciplina: { nome: 'asc' } }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    return { success: true, data: configs }
  } catch (error) {
    console.error("[listarConfigs] Erro:", error)
    return { success: false, error: "Erro ao listar configurações" }
  }
}

export async function criarConfig(data: {
  nome: string
  totalQuestoes: number
  disciplinas: ConfigDisciplinaInput[]
}) {
  try {
    await requireAdminAuth()

    const config = await prisma.configSimulado.create({
      data: {
        nome: data.nome,
        totalQuestoes: data.totalQuestoes,
        disciplinas: {
          create: data.disciplinas.map(d => ({
            disciplinaId: d.disciplinaId,
            totalQuestoes: d.totalQuestoes
          }))
        }
      },
      include: {
        disciplinas: { include: { disciplina: true } }
      }
    })

    return { success: true, data: config }
  } catch (error) {
    console.error("[criarConfig] Erro:", error)
    return { success: false, error: "Erro ao criar configuração" }
  }
}

export async function atualizarConfig(id: string, data: {
  nome?: string
  totalQuestoes?: number
  ativo?: boolean
}) {
  try {
    await requireAdminAuth()

    const config = await prisma.configSimulado.update({
      where: { id },
      data
    })

    return { success: true, data: config }
  } catch (error) {
    console.error("[atualizarConfig] Erro:", error)
    return { success: false, error: "Erro ao atualizar configuração" }
  }
}

export async function deletarConfig(id: string) {
  try {
    await requireAdminAuth()

    await prisma.configSimulado.delete({ where: { id } })

    return { success: true }
  } catch (error) {
    console.error("[deletarConfig] Erro:", error)
    return { success: false, error: "Erro ao deletar configuração" }
  }
}

// Para uso do usuário (sem auth admin)
export async function listarConfigsAtivas() {
  try {
    const configs = await prisma.configSimulado.findMany({
      where: { ativo: true },
      include: {
        disciplinas: {
          include: { disciplina: { select: { id: true, nome: true, cor: true } } },
          orderBy: { disciplina: { nome: 'asc' } }
        }
      },
      orderBy: { nome: 'asc' }
    })
    return { success: true, data: configs }
  } catch (error) {
    console.error("[listarConfigsAtivas] Erro:", error)
    return { success: false, error: "Erro ao listar configurações" }
  }
}
