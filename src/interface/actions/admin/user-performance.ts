'use server'

import { prisma } from '@/lib/prisma'
import { getAdminSession } from './auth'

export async function searchUsers(query: string) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        hash: true,
        createdAt: true
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, users }
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return { error: 'Erro ao buscar usuários' }
  }
}

export async function getUserPerformance(userId: string) {
  const session = await getAdminSession()
  if (!session) {
    return { error: 'Não autorizado' }
  }

  try {
    // Dados básicos do usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        hash: true,
        createdAt: true
      }
    })

    if (!user) {
      return { error: 'Usuário não encontrado' }
    }

    // Estatísticas de Leitura
    const [
      materiaisUsuario,
      historicoLeitura,
      tempoTotalLeitura,
      totalPaginasLidas
    ] = await Promise.all([
      prisma.materialEstudo.findMany({
        where: { userId },
        select: {
          id: true,
          nome: true,
          tipo: true,
          totalPaginas: true,
          paginasLidas: true,
          createdAt: true,
          _count: {
            select: {
              historicoLeitura: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),

      prisma.historicoLeitura.findMany({
        where: {
          material: {
            userId
          },
          // Filtrar apenas sessões reais de estudo
          nomeSessao: { not: null },
          assuntosEstudados: { not: null },
          NOT: {
            assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' }
          }
        },
        include: {
          material: {
            select: {
              nome: true,
              tipo: true
            }
          }
        },
        orderBy: { dataLeitura: 'desc' },
        take: 100
      }),

      prisma.historicoLeitura.aggregate({
        where: {
          material: {
            userId
          },
          // Filtrar apenas sessões reais de estudo
          nomeSessao: { not: null },
          assuntosEstudados: { not: null },
          NOT: {
            assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' }
          }
        },
        _sum: {
          tempoLeituraSegundos: true
        }
      }),

      prisma.materialEstudo.aggregate({
        where: { userId },
        _sum: {
          paginasLidas: true
        }
      })
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

        const [count, tempo] = await Promise.all([
          prisma.historicoLeitura.count({
            where: {
              material: { userId },
              dataLeitura: {
                gte: date,
                lt: nextDate
              }
            }
          }),
          prisma.historicoLeitura.aggregate({
            where: {
              material: { userId },
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
          sessoes: count,
          tempoSegundos: tempo._sum.tempoLeituraSegundos || 0
        }
      })
    )

    // Estatísticas de Questões e Simulados
    const [
      simulados,
      totalQuestoes,
      questoesCorretas,
      performancePorDisciplina
    ] = await Promise.all([
      prisma.simulado.findMany({
        where: { userId },
        include: {
          questoes: {
            select: {
              id: true,
              acertou: true,
              respostaUsuario: true
            }
          },
          disciplinas: {
            include: {
              disciplina: {
                select: {
                  nome: true,
                  cor: true
                }
              },
              questoes: {
                select: {
                  id: true,
                  acertou: true,
                  respostaUsuario: true
                }
              }
            }
          }
        },
        orderBy: { dataRealizacao: 'desc' }
      }),

      prisma.questaoSimulado.count({
        where: {
          simulado: { userId },
          respostaUsuario: { not: null }
        }
      }),

      prisma.questaoSimulado.count({
        where: {
          simulado: { userId },
          acertou: true
        }
      }),

      prisma.$queryRaw<Array<{
        disciplinaId: string
        disciplinaNome: string
        totalQuestoes: bigint
        questoesCorretas: bigint
        percentualAcerto: number
      }>>`
        SELECT
          d.id as "disciplinaId",
          d.nome as "disciplinaNome",
          COUNT(q.id) as "totalQuestoes",
          COUNT(CASE WHEN q.acertou = true THEN 1 END) as "questoesCorretas",
          CASE
            WHEN COUNT(q.id) > 0 THEN
              ROUND((COUNT(CASE WHEN q.acertou = true THEN 1 END)::numeric / COUNT(q.id)::numeric * 100), 2)::double precision
            ELSE 0
          END as "percentualAcerto"
        FROM "Disciplina" d
        INNER JOIN "SimuladoDisciplina" sd ON sd."disciplinaId" = d.id
        INNER JOIN "Simulado" s ON s.id = sd."simuladoId" AND s."userId" = ${userId}
        LEFT JOIN "QuestaoSimulado" q ON q."simuladoDisciplinaId" = sd.id AND q."respostaUsuario" IS NOT NULL
        GROUP BY d.id, d.nome
        HAVING COUNT(q.id) > 0
        ORDER BY "percentualAcerto" DESC
      `
    ])

    // Processar dados dos simulados
    const simuladosComNotas = simulados.map(simulado => {
      const questoesRespondidas = simulado.questoes.filter(q => q.respostaUsuario !== null)
      const questoesCorretas = questoesRespondidas.filter(q => q.acertou === true)
      const notaGeral = questoesRespondidas.length > 0
        ? (questoesCorretas.length / questoesRespondidas.length) * 100
        : 0

      const disciplinasComNotas = simulado.disciplinas.map(sd => {
        const questoesDisciplina = sd.questoes.filter(q => q.respostaUsuario !== null)
        const corretasDisciplina = questoesDisciplina.filter(q => q.acertou === true)
        const notaDisciplina = questoesDisciplina.length > 0
          ? (corretasDisciplina.length / questoesDisciplina.length) * 100
          : 0

        let status: 'verde' | 'amarelo' | 'vermelho' = 'verde'
        if (notaDisciplina < sd.limiteVermelho) {
          status = 'vermelho'
        } else if (notaDisciplina < sd.limiteAmarelo) {
          status = 'amarelo'
        }

        return {
          disciplinaId: sd.disciplinaId,
          disciplinaNome: sd.disciplina.nome,
          disciplinaCor: sd.disciplina.cor,
          questoesTotal: questoesDisciplina.length,
          questoesCorretas: corretasDisciplina.length,
          nota: notaDisciplina,
          status
        }
      })

      return {
        id: simulado.id,
        nome: simulado.nome,
        dataRealizacao: simulado.dataRealizacao,
        status: simulado.status,
        tempoTotalSegundos: simulado.tempoTotalSegundos,
        questoesTotal: questoesRespondidas.length,
        questoesCorretas: questoesCorretas.length,
        notaGeral: notaGeral,
        disciplinas: disciplinasComNotas
      }
    })

    // Evolução da taxa de acerto ao longo dos simulados
    const evolucaoTaxaAcerto = simuladosComNotas.map((sim, index) => ({
      simuladoNome: sim.nome,
      ordem: index + 1,
      nota: sim.notaGeral,
      data: sim.dataRealizacao
    })).reverse() // Ordem cronológica

    const taxaAcertoGeral = totalQuestoes > 0
      ? (questoesCorretas / totalQuestoes) * 100
      : 0

    // Buscar estatísticas do ciclo atual (questões e horas por dia)
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: {
        userId,
        ativo: true
      },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: {
                  select: {
                    nome: true,
                    cor: true
                  }
                },
                dias: true
              }
            }
          },
          orderBy: {
            numeroSemana: 'desc'
          },
          take: 1
        }
      }
    })

    let evolucaoCiclo = null
    if (planoAtivo && planoAtivo.semanas.length > 0) {
      const cicloAtual = planoAtivo.semanas[0]

      // Calcular dias decorridos no ciclo
      const inicioNormalizado = new Date(cicloAtual.dataInicio)
      inicioNormalizado.setHours(0, 0, 0, 0)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const diffTime = hoje.getTime() - inicioNormalizado.getTime()
      const diasDecorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

      // Agregar dados por dia
      const diasMap = new Map()
      for (let i = 0; i < diasDecorridos; i++) {
        const diaId = `dia${i + 1}`
        const dataDia = new Date(inicioNormalizado)
        dataDia.setDate(dataDia.getDate() + i)

        diasMap.set(diaId, {
          dia: diaId,
          data: dataDia,
          horasPlanejadas: 0,
          horasRealizadas: 0,
          questoesPlanejadas: 0,
          questoesRealizadas: 0
        })
      }

      // Agregar valores de todas as disciplinas
      cicloAtual.disciplinas.forEach(disciplinaSemana => {
        disciplinaSemana.dias.forEach(disciplinaDia => {
          const diaData = diasMap.get(disciplinaDia.dia)
          if (diaData) {
            diaData.horasPlanejadas += disciplinaDia.horasPlanejadas
            diaData.horasRealizadas += disciplinaDia.horasRealizadas
            diaData.questoesPlanejadas += disciplinaDia.questoesPlanejadas
            diaData.questoesRealizadas += disciplinaDia.questoesRealizadas
          }
        })
      })

      evolucaoCiclo = {
        nomeCiclo: `Ciclo ${cicloAtual.numeroSemana || 1}`,
        dataInicio: cicloAtual.dataInicio,
        dataFim: cicloAtual.dataFim,
        dias: Array.from(diasMap.values()).sort((a, b) => {
          const numA = parseInt(a.dia.replace('dia', ''))
          const numB = parseInt(b.dia.replace('dia', ''))
          return numA - numB
        })
      }
    }

    return {
      success: true,
      data: {
        user,
        leitura: {
          materiais: materiaisUsuario,
          materiaisEmProgresso: materiaisUsuario.filter(m => m.paginasLidas > 0 && m.paginasLidas < m.totalPaginas).length,
          materiaisConcluidos: materiaisUsuario.filter(m => m.paginasLidas >= m.totalPaginas).length,
          historicoRecente: historicoLeitura,
          tempoTotalSegundos: tempoTotalLeitura._sum.tempoLeituraSegundos || 0,
          totalPaginasLidas: totalPaginasLidas._sum.paginasLidas || 0,
          totalSessoes: historicoLeitura.length,
          mediaTempoPorSessao: historicoLeitura.length > 0
            ? (tempoTotalLeitura._sum.tempoLeituraSegundos || 0) / historicoLeitura.length
            : 0,
          leiturasPorDia
        },
        questoes: {
          totalSimulados: simulados.length,
          simuladosFinalizados: simulados.filter(s => s.status === 'finalizado').length,
          totalQuestoes,
          questoesCorretas,
          taxaAcertoGeral,
          performancePorDisciplina: performancePorDisciplina.map(d => ({
            ...d,
            totalQuestoes: Number(d.totalQuestoes),
            questoesCorretas: Number(d.questoesCorretas),
            percentualAcerto: Number(d.percentualAcerto)
          })),
          simulados: simuladosComNotas,
          evolucaoTaxaAcerto
        },
        evolucaoCiclo
      }
    }
  } catch (error) {
    console.error('Erro ao buscar performance do usuário:', error)
    return { error: 'Erro ao buscar performance do usuário' }
  }
}
