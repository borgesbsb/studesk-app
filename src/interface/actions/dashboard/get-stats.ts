"use server"

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helpers'

export interface DashboardStats {
  totalMateriais: number
  totalDisciplinas: number
  materiaisRecentes: Array<{
    id: string
    nome: string
    paginaAtual: number
    totalPaginas: number
    createdAt: string
  }>
  tempoEstudadoHoje: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const { userId } = await requireAuth()

    // Buscar total de materiais
    const totalMateriais = await prisma.materialEstudo.count({
      where: { userId }
    })

    // Buscar total de disciplinas
    const totalDisciplinas = await prisma.disciplina.count({
      where: { userId }
    })

    // Buscar materiais recentes (últimos 5)
    const materiaisRecentesData = await prisma.materialEstudo.findMany({
      where: { userId },
      select: {
        id: true,
        nome: true,
        paginaAtual: true,
        totalPaginas: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    const materiaisRecentes = materiaisRecentesData.map(material => ({
      id: material.id,
      nome: material.nome,
      paginaAtual: material.paginaAtual,
      totalPaginas: material.totalPaginas,
      createdAt: material.createdAt.toISOString()
    }))

    // Buscar tempo estudado hoje (do plano ativo)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId,
        ativo: true,
        dataInicio: { lte: hoje },
        dataFim: { gte: hoje }
      },
      include: {
        semanas: {
          where: {
            dataInicio: { lte: hoje },
            dataFim: { gte: hoje }
          },
          include: {
            disciplinas: {
              select: {
                horasRealizadas: true
              }
            }
          }
        }
      }
    })

    // Somar horas realizadas (em minutos) e converter para horas
    const tempoEstudadoMinutos = planoAtivo?.semanas.reduce((total, semana) => {
      const horasSemana = semana.disciplinas.reduce((subtotal, disciplina) => {
        return subtotal + disciplina.horasRealizadas
      }, 0)
      return total + horasSemana
    }, 0) || 0

    const tempoEstudadoHoje = Math.round((tempoEstudadoMinutos / 60) * 100) / 100

    return {
      totalMateriais,
      totalDisciplinas,
      materiaisRecentes,
      tempoEstudadoHoje
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return {
      totalMateriais: 0,
      totalDisciplinas: 0,
      materiaisRecentes: [],
      tempoEstudadoHoje: 0
    }
  }
}
