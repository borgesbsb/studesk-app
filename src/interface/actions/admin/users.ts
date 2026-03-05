'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'
import { Prisma } from '@prisma/client'

export async function getUsers(page = 1, limit = 20, search?: string) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } }
          ]
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          hash: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              disciplinas: true,
              materiaisEstudo: true,
              planosEstudo: true,
              resultadosSimulado: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    return {
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return { error: 'Erro ao buscar usuários' }
  }
}

export async function getUserDetails(userId: string) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            disciplinas: true,
            materiaisEstudo: true,
            planosEstudo: true,
            resultadosSimulado: true
          }
        }
      }
    })

    if (!user) {
      return { error: 'Usuário não encontrado' }
    }

    return { success: true, user }
  } catch (error) {
    console.error('Erro ao buscar detalhes do usuário:', error)
    return { error: 'Erro ao buscar detalhes do usuário' }
  }
}

export async function deleteUser(userId: string) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    await prisma.user.delete({
      where: { id: userId }
    })

    return { success: true, message: 'Usuário deletado com sucesso' }
  } catch (error) {
    console.error('Erro ao deletar usuário:', error)
    return { error: 'Erro ao deletar usuário' }
  }
}

export async function getAdminStats() {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const [
      totalUsers,
      totalDisciplinas,
      totalMateriais,
      totalPlanos,
      totalSimulados,
      usersLast30Days,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.disciplina.count(),
      prisma.materialEstudo.count(),
      prisma.planoEstudo.count(),
      prisma.simulado.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ])

    // Estatísticas de uso por dia (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const usageByDay = await Promise.all(
      last7Days.map(async (date) => {
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const count = await prisma.historicoLeitura.count({
          where: {
            dataLeitura: {
              gte: date,
              lt: nextDate
            }
          }
        })

        return {
          date: date.toISOString().split('T')[0],
          count
        }
      })
    )

    return {
      success: true,
      stats: {
        totalUsers,
        totalDisciplinas,
        totalMateriais,
        totalPlanos,
        totalSimulados,
        usersLast30Days,
        recentUsers,
        usageByDay
      }
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return { error: 'Erro ao buscar estatísticas' }
  }
}
