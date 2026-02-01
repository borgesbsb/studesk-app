import { prisma } from "@/lib/prisma"

export interface SimuladoComMetrics {
  id: string
  nome: string
  descricao: string | null
  dataRealizacao: Date
  status: string
  tempoTotalSegundos: number | null
  semanaEstudo: {
    id: string
    numeroSemana: number
    plano: {
      id: string
      nome: string
    }
  } | null
  totalQuestoes: number
  questoesRespondidas: number
  questoesCorretas: number
  percentualGeral: number
  totalDisciplinas: number
}

export class SimuladoService {
  /**
   * Lista todos os simulados do usuário com métricas calculadas
   */
  static async listarSimulados(userId: string): Promise<SimuladoComMetrics[]> {
    const simulados = await prisma.simulado.findMany({
      where: { userId },
      include: {
        semanaEstudo: {
          select: {
            id: true,
            numeroSemana: true,
            plano: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        },
        disciplinas: {
          include: {
            disciplina: {
              select: {
                id: true,
                nome: true
              }
            }
          }
        },
        questoes: {
          select: {
            id: true,
            respostaUsuario: true,
            acertou: true
          }
        }
      },
      orderBy: {
        dataRealizacao: 'desc'
      }
    })

    // Calcular métricas para cada simulado
    return simulados.map(simulado => {
      const totalQuestoes = simulado.questoes.length
      const questoesRespondidas = simulado.questoes.filter(q => q.respostaUsuario !== null).length
      const questoesCorretas = simulado.questoes.filter(q => q.acertou === true).length
      const percentualGeral = totalQuestoes > 0 ? (questoesCorretas / totalQuestoes) * 100 : 0

      return {
        id: simulado.id,
        nome: simulado.nome,
        descricao: simulado.descricao,
        dataRealizacao: simulado.dataRealizacao,
        status: simulado.status,
        tempoTotalSegundos: simulado.tempoTotalSegundos,
        semanaEstudo: simulado.semanaEstudo,
        totalQuestoes,
        questoesRespondidas,
        questoesCorretas,
        percentualGeral: Math.round(percentualGeral * 10) / 10, // Arredondar para 1 casa decimal
        totalDisciplinas: simulado.disciplinas.length
      }
    })
  }

  /**
   * Busca um simulado específico com todas as suas relações
   */
  static async buscarSimuladoPorId(simuladoId: string, userId: string) {
    return await prisma.simulado.findFirst({
      where: {
        id: simuladoId,
        userId
      },
      include: {
        semanaEstudo: {
          include: {
            plano: true
          }
        },
        disciplinas: {
          include: {
            disciplina: true,
            questoes: true
          }
        },
        questoes: {
          include: {
            simuladoDisciplina: {
              include: {
                disciplina: true
              }
            }
          }
        }
      }
    })
  }

  /**
   * Calcula métricas de uma disciplina em um simulado
   */
  static async calcularMetricasDisciplina(simuladoDisciplinaId: string) {
    const questoes = await prisma.questaoSimulado.findMany({
      where: { simuladoDisciplinaId }
    })

    const totalQuestoes = questoes.length
    const questoesRespondidas = questoes.filter(q => q.respostaUsuario !== null).length
    const questoesCorretas = questoes.filter(q => q.acertou === true).length
    const questoesErradas = questoes.filter(q => q.acertou === false).length
    const percentualAcerto = totalQuestoes > 0 ? (questoesCorretas / totalQuestoes) * 100 : 0

    return {
      totalQuestoes,
      questoesRespondidas,
      questoesCorretas,
      questoesErradas,
      percentualAcerto: Math.round(percentualAcerto * 10) / 10
    }
  }

  /**
   * Calcula a cor do status (semáforo) baseado no percentual de acerto
   */
  static calcularStatusCor(
    percentualAcerto: number,
    limiteVermelho: number = 50.0,
    limiteAmarelo: number = 70.0
  ): 'vermelho' | 'amarelo' | 'verde' {
    if (percentualAcerto < limiteVermelho) {
      return 'vermelho'
    } else if (percentualAcerto < limiteAmarelo) {
      return 'amarelo'
    } else {
      return 'verde'
    }
  }

  /**
   * Busca as disciplinas de um simulado com suas métricas calculadas
   */
  static async listarDisciplinasDoSimulado(simuladoId: string, userId: string) {
    const simulado = await prisma.simulado.findFirst({
      where: {
        id: simuladoId,
        userId
      },
      include: {
        disciplinas: {
          include: {
            disciplina: {
              select: {
                id: true,
                nome: true,
                cor: true
              }
            },
            questoes: {
              select: {
                id: true,
                ordem: true,
                respostaCorreta: true,
                respostaUsuario: true,
                acertou: true
              },
              orderBy: {
                ordem: 'asc'
              }
            }
          }
        }
      }
    })

    if (!simulado) {
      return null
    }

    // Calcular métricas para cada disciplina
    const disciplinasComMetrics = simulado.disciplinas.map(simDisciplina => {
      const totalQuestoes = simDisciplina.questoes.length
      const questoesRespondidas = simDisciplina.questoes.filter(q => q.respostaUsuario !== null).length
      const acertos = simDisciplina.questoes.filter(q => q.acertou === true).length
      const erros = simDisciplina.questoes.filter(q => q.acertou === false).length
      const percentualAcerto = totalQuestoes > 0 ? (acertos / totalQuestoes) * 100 : 0

      // Calcular status (cor do semáforo)
      const statusCor = this.calcularStatusCor(
        percentualAcerto,
        simDisciplina.limiteVermelho,
        simDisciplina.limiteAmarelo
      )

      return {
        id: simDisciplina.id,
        disciplina: simDisciplina.disciplina,
        questoes: simDisciplina.questoes,
        totalQuestoes,
        questoesRespondidas,
        acertos,
        erros,
        percentualAcerto: Math.round(percentualAcerto * 10) / 10,
        statusCor,
        limiteVermelho: simDisciplina.limiteVermelho,
        limiteAmarelo: simDisciplina.limiteAmarelo
      }
    })

    return disciplinasComMetrics
  }
}
