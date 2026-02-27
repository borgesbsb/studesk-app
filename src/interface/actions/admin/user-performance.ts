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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, hash: true, createdAt: true }
    })

    if (!user) {
      return { error: 'Usuário não encontrado' }
    }

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
          _count: { select: { historicoLeitura: true } }
        },
        orderBy: { updatedAt: 'desc' }
      }),

      prisma.historicoLeitura.findMany({
        where: {
          material: { userId },
          nomeSessao: { not: null },
          assuntosEstudados: { not: null },
          NOT: { assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' } }
        },
        include: { material: { select: { nome: true, tipo: true } } },
        orderBy: { dataLeitura: 'desc' },
        take: 100
      }),

      prisma.historicoLeitura.aggregate({
        where: {
          material: { userId },
          nomeSessao: { not: null },
          assuntosEstudados: { not: null },
          NOT: { assuntosEstudados: { contains: '[TEMPO TRANSFERIDO]' } }
        },
        _sum: { tempoLeituraSegundos: true }
      }),

      prisma.materialEstudo.aggregate({
        where: { userId },
        _sum: { paginasLidas: true }
      })
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

        const [count, tempo] = await Promise.all([
          prisma.historicoLeitura.count({
            where: { material: { userId }, dataLeitura: { gte: date, lt: nextDate } }
          }),
          prisma.historicoLeitura.aggregate({
            where: { material: { userId }, dataLeitura: { gte: date, lt: nextDate } },
            _sum: { tempoLeituraSegundos: true }
          })
        ])

        return {
          date: date.toISOString().split('T')[0],
          sessoes: count,
          tempoSegundos: tempo._sum.tempoLeituraSegundos || 0
        }
      })
    )

    // Simulados com novo schema simplificado
    const simulados = await prisma.simulado.findMany({
      where: { userId },
      include: {
        config: { select: { id: true, nome: true } },
        disciplinas: {
          include: { disciplina: { select: { nome: true, cor: true } } }
        }
      },
      orderBy: { dataRealizacao: 'desc' }
    })

    const simuladosComNotas = simulados.map(simulado => ({
      id: simulado.id,
      nome: simulado.nome,
      dataRealizacao: simulado.dataRealizacao,
      totalQuestoes: simulado.totalQuestoes,
      totalAcertos: simulado.totalAcertos,
      percentualGeral: simulado.percentualGeral,
      config: simulado.config,
      disciplinas: simulado.disciplinas.map(sd => ({
        disciplinaId: sd.disciplinaId,
        disciplinaNome: sd.disciplina.nome,
        disciplinaCor: sd.disciplina.cor,
        totalQuestoes: sd.totalQuestoes,
        acertos: sd.acertos,
        percentual: sd.percentual
      }))
    }))

    const totalQuestoesGeral = simulados.reduce((s, sim) => s + sim.totalQuestoes, 0)
    const totalAcertosGeral = simulados.reduce((s, sim) => s + sim.totalAcertos, 0)
    const taxaAcertoGeral = totalQuestoesGeral > 0
      ? (totalAcertosGeral / totalQuestoesGeral) * 100
      : 0

    const evolucaoTaxaAcerto = [...simuladosComNotas].reverse().map((sim, index) => ({
      simuladoNome: sim.nome,
      ordem: index + 1,
      nota: sim.percentualGeral,
      data: sim.dataRealizacao
    }))

    // Ciclo atual
    const planoAtivo = await prisma.planoEstudo.findFirst({
      where: { userId, ativo: true },
      include: {
        semanas: {
          include: {
            disciplinas: {
              include: {
                disciplina: { select: { nome: true, cor: true } },
                dias: true
              }
            }
          },
          orderBy: { numeroSemana: 'desc' },
          take: 1
        }
      }
    })

    let evolucaoCiclo = null
    if (planoAtivo && planoAtivo.semanas.length > 0) {
      const cicloAtual = planoAtivo.semanas[0]

      const inicioNormalizado = new Date(cicloAtual.dataInicio)
      inicioNormalizado.setHours(0, 0, 0, 0)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const diffTime = hoje.getTime() - inicioNormalizado.getTime()
      const diasDecorridos = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

      const diasMap = new Map()
      for (let i = 0; i < diasDecorridos; i++) {
        const diaId = `dia${i + 1}`
        const dataDia = new Date(inicioNormalizado)
        dataDia.setDate(dataDia.getDate() + i)
        diasMap.set(diaId, { dia: diaId, data: dataDia, horasPlanejadas: 0, horasRealizadas: 0, questoesPlanejadas: 0, questoesRealizadas: 0 })
      }

      cicloAtual.disciplinas.forEach(ds => {
        ds.dias.forEach(dd => {
          const diaData = diasMap.get(dd.dia)
          if (diaData) {
            diaData.horasPlanejadas += dd.horasPlanejadas
            diaData.horasRealizadas += dd.horasRealizadas
            diaData.questoesPlanejadas += dd.questoesPlanejadas
            diaData.questoesRealizadas += dd.questoesRealizadas
          }
        })
      })

      evolucaoCiclo = {
        nomeCiclo: `Ciclo ${cicloAtual.numeroSemana || 1}`,
        dataInicio: cicloAtual.dataInicio,
        dataFim: cicloAtual.dataFim,
        dias: Array.from(diasMap.values()).sort((a, b) =>
          parseInt(a.dia.replace('dia', '')) - parseInt(b.dia.replace('dia', ''))
        )
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
          totalQuestoes: totalQuestoesGeral,
          totalAcertos: totalAcertosGeral,
          taxaAcertoGeral,
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
