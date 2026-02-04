'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function getReadingStatistics() {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    // Estatísticas gerais de leitura
    const [
      totalHistoricoLeitura,
      totalTempoLeitura,
      totalPaginasLidas,
      usuariosAtivos,
      leiturasPorUsuario
    ] = await Promise.all([
      // Total de registros de leitura
      prisma.historicoLeitura.count(),

      // Tempo total de leitura (em segundos)
      prisma.historicoLeitura.aggregate({
        _sum: {
          tempoLeituraSegundos: true
        }
      }),

      // Total de páginas lidas (soma das páginas atuais)
      prisma.historicoLeitura.aggregate({
        _sum: {
          paginaAtual: true
        }
      }),

      // Usuários com pelo menos 1 leitura
      prisma.historicoLeitura.groupBy({
        by: ['materialId'],
        _count: true
      }),

      // Top 10 usuários por tempo de leitura
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

    // Leituras por dia (últimos 30 dias)
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
            where: {
              dataLeitura: {
                gte: date,
                lt: nextDate
              }
            }
          }),
          prisma.historicoLeitura.aggregate({
            where: {
              dataLeitura: {
                gte: date,
                lt: nextDate
              }
            },
            _sum: {
              tempoLeituraSegundos: true
            }
          })
        ])

        return {
          date: date.toISOString().split('T')[0],
          count,
          tempoTotalSegundos: tempoTotal._sum.tempoLeituraSegundos || 0
        }
      })
    )

    // Materiais mais lidos
    const materiaisMaisLidos = await prisma.materialEstudo.findMany({
      select: {
        id: true,
        nome: true,
        tipo: true,
        _count: {
          select: {
            historicoLeitura: true
          }
        }
      },
      orderBy: {
        historicoLeitura: {
          _count: 'desc'
        }
      },
      take: 10
    })

    return {
      success: true,
      statistics: {
        totalHistoricoLeitura,
        totalTempoLeituraSegundos: totalTempoLeitura._sum.tempoLeituraSegundos || 0,
        totalPaginasLidas: totalPaginasLidas._sum.paginaAtual || 0,
        usuariosAtivos: usuariosAtivos.length,
        leiturasPorUsuario: leiturasPorUsuario.map(item => ({
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
    // Buscar todos os simulados com suas questões
    const [
      totalSimulados,
      totalQuestoes,
      totalQuestoesRespondidas,
      totalQuestoesCorretas,
      simuladosFinalizados,
      usuariosComSimulados
    ] = await Promise.all([
      // Total de simulados
      prisma.simulado.count(),

      // Total de questões criadas
      prisma.questaoSimulado.count(),

      // Total de questões respondidas
      prisma.questaoSimulado.count({
        where: {
          respostaUsuario: {
            not: null
          }
        }
      }),

      // Total de questões corretas
      prisma.questaoSimulado.count({
        where: {
          acertou: true
        }
      }),

      // Simulados finalizados
      prisma.simulado.count({
        where: {
          status: 'finalizado'
        }
      }),

      // Usuários que fizeram simulados
      prisma.simulado.groupBy({
        by: ['userId'],
        _count: true
      })
    ])

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
        COUNT(q.id) as "totalQuestoes",
        COUNT(CASE WHEN q.acertou = true THEN 1 END) as "totalCorretas",
        CASE
          WHEN COUNT(q.id) > 0 THEN
            ROUND((COUNT(CASE WHEN q.acertou = true THEN 1 END)::numeric / COUNT(q.id)::numeric * 100), 2)::double precision
          ELSE 0
        END as "percentualAcerto"
      FROM "User" u
      INNER JOIN "Simulado" s ON s."userId" = u.id
      LEFT JOIN "QuestaoSimulado" q ON q."simuladoId" = s.id AND q."respostaUsuario" IS NOT NULL
      GROUP BY u.id, u.name, u.email
      HAVING COUNT(q.id) > 0
      ORDER BY "percentualAcerto" DESC
      LIMIT 10
    `

    // Simulados por dia (últimos 30 dias)
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

        const [simuladosCount, questoesCount] = await Promise.all([
          prisma.simulado.count({
            where: {
              dataRealizacao: {
                gte: date,
                lt: nextDate
              }
            }
          }),
          prisma.questaoSimulado.count({
            where: {
              simulado: {
                dataRealizacao: {
                  gte: date,
                  lt: nextDate
                }
              },
              respostaUsuario: {
                not: null
              }
            }
          })
        ])

        return {
          date: date.toISOString().split('T')[0],
          simulados: simuladosCount,
          questoesRespondidas: questoesCount
        }
      })
    )

    // Disciplinas mais praticadas
    const disciplinasMaisPraticadas = await prisma.simuladoDisciplina.groupBy({
      by: ['disciplinaId'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
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

    const percentualAcertoGeral = totalQuestoesRespondidas > 0
      ? ((totalQuestoesCorretas / totalQuestoesRespondidas) * 100).toFixed(2)
      : '0.00'

    return {
      success: true,
      statistics: {
        totalSimulados,
        totalQuestoes,
        totalQuestoesRespondidas,
        totalQuestoesCorretas,
        percentualAcertoGeral: parseFloat(percentualAcertoGeral),
        simuladosFinalizados,
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
