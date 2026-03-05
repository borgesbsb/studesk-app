"use server"

import { requireAdminAuth } from "@/lib/admin-auth"
import { prisma } from "@/lib/prisma"

// ─── ConfigSimulado (templates de disciplinas) ───────────────────────────────

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
    return { success: false, error: "Erro ao listar configurações" }
  }
}

export async function criarConfig(data: {
  nome: string
  totalQuestoes: number
  disciplinas: { disciplinaId: string; totalQuestoes: number }[]
}) {
  try {
    await requireAdminAuth()
    const config = await prisma.configSimulado.create({
      data: {
        nome: data.nome,
        totalQuestoes: data.totalQuestoes,
        disciplinas: { create: data.disciplinas }
      },
      include: { disciplinas: { include: { disciplina: true } } }
    })
    return { success: true, data: config }
  } catch (error) {
    return { success: false, error: "Erro ao criar configuração" }
  }
}

export async function atualizarConfig(id: string, data: { nome?: string; totalQuestoes?: number; ativo?: boolean }) {
  try {
    await requireAdminAuth()
    const config = await prisma.configSimulado.update({ where: { id }, data })
    return { success: true, data: config }
  } catch (error) {
    return { success: false, error: "Erro ao atualizar configuração" }
  }
}

export async function deletarConfig(id: string) {
  try {
    await requireAdminAuth()
    await prisma.configSimulado.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erro ao deletar configuração" }
  }
}

// ─── Simulados (eventos criados pelo admin) ───────────────────────────────────

export async function listarSimuladosAdmin() {
  try {
    await requireAdminAuth()
    const simulados = await prisma.simulado.findMany({
      include: {
        config: { select: { id: true, nome: true, totalQuestoes: true } },
        _count: { select: { resultados: true } }
      },
      orderBy: { dataRealizacao: 'desc' }
    })
    return { success: true, data: simulados }
  } catch (error) {
    return { success: false, error: "Erro ao listar simulados" }
  }
}

export async function criarSimuladoAdmin(data: {
  nome: string
  configSimuladoId?: string
  dataRealizacao: Date
}) {
  try {
    await requireAdminAuth()
    const simulado = await prisma.simulado.create({
      data: {
        nome: data.nome,
        configSimuladoId: data.configSimuladoId || null,
        dataRealizacao: data.dataRealizacao,
        ativo: true
      },
      include: { config: true }
    })
    return { success: true, data: simulado }
  } catch (error) {
    return { success: false, error: "Erro ao criar simulado" }
  }
}

export async function atualizarSimuladoAdmin(id: string, data: { nome?: string; ativo?: boolean; dataRealizacao?: Date }) {
  try {
    await requireAdminAuth()
    const simulado = await prisma.simulado.update({ where: { id }, data })
    return { success: true, data: simulado }
  } catch (error) {
    return { success: false, error: "Erro ao atualizar simulado" }
  }
}

export async function deletarSimuladoAdmin(id: string) {
  try {
    await requireAdminAuth()
    await prisma.simulado.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: "Erro ao deletar simulado" }
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
    return { success: false, error: "Erro ao listar configurações" }
  }
}
