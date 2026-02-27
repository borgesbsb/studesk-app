'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function getReadingStatistics() {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const [
      totalHistoricoLeitura,
      totalTempoLeitura,
      totalPaginasLidas,
      usuariosAtivos,
      leiturasPorUsuario
    ] = await Promise.all([
      prisma.historicoLeitura.count(),

      prisma.historicoLeitura.aggregate({
        _sum: { tempoLeituraSegundos: true }
      }),

      prisma.historicoLeitura.aggregate({
        _sum: { paginaAtual: true }
      }),

      prisma.historicoLeitura.groupBy({
        by: ['materialId'],
        _count: true
      }),

      prisma.$queryRaw<Array<{
        userId: string
        userName: string | null
        userEmail: string
        totalTempoSegundos: bigint
        totalSessoes: bigint
        ultimaLeitura: Date
      }>>`
        SELECT
          u.id as "userId",
          u.name as "userName",
          u.email as "userEmail",
          SUM(hl."tempoLeituraSegundos") as "totalTempoSegundos",
          COUNT(hl.id) as "totalSessoes",
          MAX(hl."dataLeitura") as "ultimaLeitura"
        FROM "User" u
        INNER JOIN "MaterialEstudo" me ON me."userId" = u.id
        INNER JOIN "HistoricoLeitura" hl ON hl."materialId" = me.id
        GROUP BY u.id, u.name, u.email
        ORDER BY "totalTempoSegundos" DESC
        LIMIT 10
      `
    ])

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const leiturasPorDia = await Promise.all(
      last30Days.map(async (date) => {
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const [count, tempoTotal] = await Promise.all([
          prisma.historicoLeitura.count({
            where: { dataLeitura: { gte: date, lt: nextDate } }
          }),
          prisma.historicoLeitura.aggregate({
            where: { dataLeitura: { gte: date, lt: nextDate } },
            _sum: { tempoLeituraSegundos: true }
          })
        ])

        return {
          date: date.toISOString().split('T')[0],
          count,
          tempoTotalSegundos: tempoTotal._sum.tempoLeituraSegundos || 0
        }
      })
    )

    const materiaisMaisLidos = await prisma.materialEstudo.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        _count: { select: { historicoLeitura: true } }
      },
      orderBy: { historicoLeitura: { _count: 'desc' } },
      take: 10
    })

    return {
      success: true,
      statistics: {
        totalHistoricoLeitura,
        totalTempoLeituraSegundos: totalTempoLeitura._sum.tempoLeituraSegundos || 0,
        totalPaginasLidas: totalPaginasLidas._sum.paginaAtual || 0,
        usuariosAtivos: usuariosAtivos.length,
        leiturasPorUsuario: usuariosAtivos.map(item => ({
          userId: item.materialId,
          count: item._count
        })),
        topUsuarios: leiturasPorUsuario.map(u => ({
          ...u,
          totalTempoSegundos: Number(u.totalTempoSegundos),
          totalSessoes: Number(u.totalSessoes)
        })),
        leiturasPorDia,
        materiaisMaisLidos
      }
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas de leitura:', error)
    return { error: 'Erro ao buscar estatísticas de leitura' }
  }
}

export async function getQuestionsStatistics() {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const [
      totalSimulados,
      usuariosComSimulados,
      agregadoSimulados
    ] = await Promise.all([
      prisma.simulado.count(),

      prisma.simulado.groupBy({
        by: ['userId'],
        _count: true
      }),

      prisma.simulado.aggregate({
        _sum: { totalQuestoes: true, totalAcertos: true }
      })
    ])

    const totalQuestoes = agregadoSimulados._sum.totalQuestoes || 0
    const totalQuestoesCorretas = agregadoSimulados._sum.totalAcertos || 0
    const percentualAcertoGeral = totalQuestoes > 0
      ? parseFloat(((totalQuestoesCorretas / totalQuestoes) * 100).toFixed(2))
      : 0

    // Performance por usuário
    const performancePorUsuario = await prisma.$queryRaw<Array<{
      userId: string
      userName: string | null
      userEmail: string
      totalSimulados: bigint
      totalQuestoes: bigint
      totalCorretas: bigint
      percentualAcerto: number
    }>>`
      SELECT
        u.id as "userId",
        u.name as "userName",
        u.email as "userEmail",
        COUNT(DISTINCT s.id) as "totalSimulados",
        SUM(s."totalQuestoes") as "totalQuestoes",
        SUM(s."totalAcertos") as "totalCorretas",
        CASE
          WHEN SUM(s."totalQuestoes") > 0 THEN
            ROUND((SUM(s."totalAcertos")::numeric / SUM(s."totalQuestoes")::numeric * 100), 2)::double precision
          ELSE 0
        END as "percentualAcerto"
      FROM "User" u
      INNER JOIN "Simulado" s ON s."userId" = u.id
      GROUP BY u.id, u.name, u.email
      HAVING SUM(s."totalQuestoes") > 0
      ORDER BY "percentualAcerto" DESC
      LIMIT 10
    `

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)
      return date
    }).reverse()

    const simuladosPorDia = await Promise.all(
      last30Days.map(async (date) => {
        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        const simuladosCount = await prisma.simulado.count({
          where: { dataRealizacao: { gte: date, lt: nextDate } }
        })

        return {
          date: date.toISOString().split('T')[0],
          simulados: simuladosCount,
          questoesRespondidas: 0
        }
      })
    )

    const disciplinasMaisPraticadas = await prisma.simuladoDisciplina.groupBy({
      by: ['disciplinaId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    })

    const disciplinasComNomes = await Promise.all(
      disciplinasMaisPraticadas.map(async (item) => {
        const disciplina = await prisma.disciplina.findUnique({
          where: { id: item.disciplinaId },
          select: { nome: true }
        })
        return {
          disciplinaId: item.disciplinaId,
          nome: disciplina?.nome || 'Desconhecida',
          count: item._count.id
        }
      })
    )

    return {
      success: true,
      statistics: {
        totalSimulados,
        totalQuestoes,
        totalQuestoesRespondidas: totalQuestoes,
        totalQuestoesCorretas,
        percentualAcertoGeral,
        simuladosFinalizados: totalSimulados,
        usuariosComSimulados: usuariosComSimulados.length,
        performancePorUsuario: performancePorUsuario.map(u => ({
          ...u,
          totalSimulados: Number(u.totalSimulados),
          totalQuestoes: Number(u.totalQuestoes),
          totalCorretas: Number(u.totalCorretas),
          percentualAcerto: Number(u.percentualAcerto)
        })),
        simuladosPorDia,
        disciplinasMaisPraticadas: disciplinasComNomes
      }
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas de questões:', error)
    return { error: 'Erro ao buscar estatísticas de questões' }
  }
}
