import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface IniciarSessaoRequest {
  sessaoQuestoesId: string
}

export interface FinalizarSessaoRequest {
  sessaoRealizadaId: string
  respostas: {
    questaoId: string
    respostaSelecionada: string | null
    tempoSegundos?: number
    ordem: number
  }[]
  tempoTotalSegundos?: number
}

export interface SessaoRealizadaCompleta {
  id: string
  sessaoQuestoesId: string
  totalQuestoes: number
  questoesCorretas: number
  questoesIncorretas: number
  questoesNaoRespondidas: number
  pontuacao: number
  percentualAcerto: number
  tempoTotalSegundos: number | null
  iniciada: boolean
  finalizada: boolean
  createdAt: Date
  updatedAt: Date
  sessaoQuestoes: {
    id: string
    titulo: string
    descricao: string | null
    materialId: string | null
    disciplinaId: string | null
  }
  respostasDetalhadas: {
    questaoId: string
    respostaSelecionada: string | null
    correto: boolean | null
    tempoSegundos: number | null
    ordem: number
    questao: {
      pergunta: string
      respostaCorreta: string
    }
  }[]
}

export interface EstatisticasProgresso {
  totalSessoesRealizadas: number
  pontuacaoMedia: number
  percentualAcertoMedio: number
  melhorPontuacao: number
  melhorPercentual: number
  ultimaSessao: Date | null
  progressoUltimos30Dias: {
    data: Date
    pontuacao: number
    percentualAcerto: number
  }[]
}

export class PontuacaoService {
  /**
   * Inicia uma nova sessão de questões
   */
  static async iniciarSessao(request: IniciarSessaoRequest): Promise<SessaoRealizadaCompleta> {
    try {
      // Buscar informações da sessão de questões
      const sessaoQuestoes = await prisma.sessaoQuestoes.findUnique({
        where: { id: request.sessaoQuestoesId },
        include: {
          questoes: {
            orderBy: { ordem: 'asc' }
          }
        }
      })

      if (!sessaoQuestoes) {
        throw new Error('Sessão de questões não encontrada')
      }

      // Criar sessão realizada
      const sessaoRealizada = await prisma.sessaoRealizada.create({
        data: {
          sessaoQuestoesId: request.sessaoQuestoesId,
          totalQuestoes: sessaoQuestoes.questoes.length,
          questoesCorretas: 0,
          questoesIncorretas: 0,
          questoesNaoRespondidas: sessaoQuestoes.questoes.length,
          pontuacao: 0,
          percentualAcerto: 0,
          iniciada: true,
          finalizada: false
        }
      })

      // Buscar sessão completa para retorno
      return await this.buscarSessaoRealizada(sessaoRealizada.id)

    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      throw error
    }
  }

  /**
   * Finaliza uma sessão e calcula a pontuação
   */
  static async finalizarSessao(request: FinalizarSessaoRequest): Promise<SessaoRealizadaCompleta> {
    try {
      // Buscar sessão realizada
      const sessaoRealizada = await prisma.sessaoRealizada.findUnique({
        where: { id: request.sessaoRealizadaId },
        include: {
          sessaoQuestoes: {
            include: {
              questoes: {
                orderBy: { ordem: 'asc' }
              }
            }
          }
        }
      })

      if (!sessaoRealizada) {
        throw new Error('Sessão realizada não encontrada')
      }

      if (sessaoRealizada.finalizada) {
        throw new Error('Sessão já foi finalizada')
      }

      // Mapear questões por ID para facilitar busca
      const questoesPorId = new Map(
        sessaoRealizada.sessaoQuestoes.questoes.map(q => [q.id, q])
      )

      // Processar respostas e calcular resultados
      let questoesCorretas = 0
      let questoesIncorretas = 0
      let questoesNaoRespondidas = 0

      const respostasDetalhadas = request.respostas.map(resposta => {
        const questao = questoesPorId.get(resposta.questaoId)
        if (!questao) {
          throw new Error(`Questão ${resposta.questaoId} não encontrada`)
        }

        let correto: boolean | null = null
        
        if (resposta.respostaSelecionada) {
          correto = resposta.respostaSelecionada === questao.respostaCorreta
          if (correto) {
            questoesCorretas++
          } else {
            questoesIncorretas++
          }
        } else {
          questoesNaoRespondidas++
        }

        return {
          questaoId: resposta.questaoId,
          respostaSelecionada: resposta.respostaSelecionada,
          correto,
          tempoSegundos: resposta.tempoSegundos,
          ordem: resposta.ordem
        }
      })

      // Calcular pontuação e percentual
      const totalRespondidas = questoesCorretas + questoesIncorretas
      const percentualAcerto = totalRespondidas > 0 ? (questoesCorretas / totalRespondidas) * 100 : 0
      const pontuacao = this.calcularPontuacao(questoesCorretas, questoesIncorretas, questoesNaoRespondidas)

      // Atualizar sessão realizada
      const sessaoAtualizada = await prisma.sessaoRealizada.update({
        where: { id: request.sessaoRealizadaId },
        data: {
          questoesCorretas,
          questoesIncorretas,
          questoesNaoRespondidas,
          pontuacao,
          percentualAcerto,
          tempoTotalSegundos: request.tempoTotalSegundos,
          finalizada: true
        }
      })

      // Salvar respostas detalhadas
      await prisma.respostaDetalhada.createMany({
        data: respostasDetalhadas.map(resposta => ({
          sessaoRealizadaId: request.sessaoRealizadaId,
          ...resposta
        }))
      })

      // Criar entrada no histórico
      await prisma.historicoPontuacao.create({
        data: {
          materialId: sessaoRealizada.sessaoQuestoes.materialId,
          disciplinaId: sessaoRealizada.sessaoQuestoes.disciplinaId,
          sessaoRealizadaId: request.sessaoRealizadaId,
          data: new Date(),
          pontuacao,
          percentualAcerto,
          totalQuestoes: sessaoRealizada.totalQuestoes,
          questoesCorretas,
          tempoTotal: request.tempoTotalSegundos
        }
      })

      // Retornar sessão completa atualizada
      return await this.buscarSessaoRealizada(request.sessaoRealizadaId)

    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
      throw error
    }
  }

  /**
   * Busca uma sessão realizada completa
   */
  static async buscarSessaoRealizada(id: string): Promise<SessaoRealizadaCompleta> {
    const sessao = await prisma.sessaoRealizada.findUnique({
      where: { id },
      include: {
        sessaoQuestoes: {
          select: {
            id: true,
            titulo: true,
            descricao: true,
            materialId: true,
            disciplinaId: true
          }
        },
        respostasDetalhadas: {
          include: {
            questao: {
              select: {
                pergunta: true,
                respostaCorreta: true
              }
            }
          },
          orderBy: { ordem: 'asc' }
        }
      }
    })

    if (!sessao) {
      throw new Error('Sessão realizada não encontrada')
    }

    return sessao
  }

  /**
   * Busca estatísticas de progresso para um material ou disciplina
   */
  static async buscarEstatisticasProgresso(params: {
    materialId?: string
    disciplinaId?: string
  }): Promise<EstatisticasProgresso> {
    try {
      const where: any = {}
      if (params.materialId) where.materialId = params.materialId
      if (params.disciplinaId) where.disciplinaId = params.disciplinaId

      // Buscar estatísticas gerais
      const estatisticas = await prisma.historicoPontuacao.aggregate({
        where,
        _count: { id: true },
        _avg: {
          pontuacao: true,
          percentualAcerto: true
        },
        _max: {
          pontuacao: true,
          percentualAcerto: true,
          data: true
        }
      })

      // Buscar progresso dos últimos 30 dias
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 30)

      const progressoRecente = await prisma.historicoPontuacao.findMany({
        where: {
          ...where,
          data: {
            gte: dataLimite
          }
        },
        select: {
          data: true,
          pontuacao: true,
          percentualAcerto: true
        },
        orderBy: { data: 'asc' }
      })

      return {
        totalSessoesRealizadas: estatisticas._count.id,
        pontuacaoMedia: estatisticas._avg.pontuacao || 0,
        percentualAcertoMedio: estatisticas._avg.percentualAcerto || 0,
        melhorPontuacao: estatisticas._max.pontuacao || 0,
        melhorPercentual: estatisticas._max.percentualAcerto || 0,
        ultimaSessao: estatisticas._max.data,
        progressoUltimos30Dias: progressoRecente
      }

    } catch (error) {
      console.error('Erro ao buscar estatísticas de progresso:', error)
      throw error
    }
  }

  /**
   * Lista histórico de pontuações
   */
  static async listarHistorico(params: {
    materialId?: string
    disciplinaId?: string
    limite?: number
    offset?: number
  }) {
    const where: any = {}
    if (params.materialId) where.materialId = params.materialId
    if (params.disciplinaId) where.disciplinaId = params.disciplinaId

    const historico = await prisma.historicoPontuacao.findMany({
      where,
      include: {
        sessaoRealizada: {
          include: {
            sessaoQuestoes: {
              select: {
                titulo: true,
                descricao: true
              }
            }
          }
        },
        material: {
          select: {
            nome: true
          }
        },
        disciplina: {
          select: {
            nome: true
          }
        }
      },
      orderBy: { data: 'desc' },
      take: params.limite || 50,
      skip: params.offset || 0
    })

    return historico
  }

  /**
   * Calcula a pontuação baseada nas respostas
   */
  private static calcularPontuacao(
    corretas: number, 
    incorretas: number, 
    naoRespondidas: number
  ): number {
    const total = corretas + incorretas + naoRespondidas
    
    if (total === 0) return 0
    
    // Sistema de pontuação:
    // - Resposta correta: +10 pontos
    // - Resposta incorreta: -2 pontos
    // - Não respondida: 0 pontos
    
    const pontosCorretas = corretas * 10
    const pontosIncorretas = incorretas * -2
    const pontuacaoTotal = pontosCorretas + pontosIncorretas
    
    // Normalizar para escala 0-100
    const pontuacaoMaxima = total * 10
    const pontuacaoNormalizada = Math.max(0, (pontuacaoTotal / pontuacaoMaxima) * 100)
    
    return Math.round(pontuacaoNormalizada * 100) / 100 // 2 casas decimais
  }
} 