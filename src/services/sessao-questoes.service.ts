import { PrismaClient } from '@prisma/client'
import { 
  SessaoQuestoes, 
  QuestaoSalva, 
  CriarSessaoQuestoesRequest, 
  SalvarRespostaRequest,
  EstatisticasSessao,
  QuestaoParaSalvar 
} from '@/domain/entities/SessaoQuestoes'

const prisma = new PrismaClient()

export class SessaoQuestoesService {
  
  /**
   * Cria uma nova sessão de questões e salva no banco de dados
   */
  static async criarSessao(request: CriarSessaoQuestoesRequest): Promise<SessaoQuestoes> {
    try {
      const sessao = await prisma.sessaoQuestoes.create({
        data: {
          materialId: request.materialId,
          disciplinaId: request.disciplinaId,
          titulo: request.titulo,
          descricao: request.descricao,
          prompt: request.prompt,
          totalQuestoes: request.questoes.length,
          questoes: {
            create: request.questoes.map((questao) => ({
              pergunta: questao.pergunta,
              alternativaA: questao.alternativaA,
              alternativaB: questao.alternativaB,
              alternativaC: questao.alternativaC,
              alternativaD: questao.alternativaD,
              alternativaE: questao.alternativaE,
              respostaCorreta: questao.respostaCorreta,
              explicacao: questao.explicacao,
              nivel: questao.nivel,
              topico: questao.topico,
              ordem: questao.ordem,
            }))
          }
        },
        include: {
          questoes: {
            orderBy: { ordem: 'asc' }
          }
        }
      })

      return {
        id: sessao.id,
        materialId: sessao.materialId || undefined,
        disciplinaId: sessao.disciplinaId || undefined,
        titulo: sessao.titulo,
        descricao: sessao.descricao || undefined,
        prompt: sessao.prompt,
        totalQuestoes: sessao.totalQuestoes,
        createdAt: sessao.createdAt,
        updatedAt: sessao.updatedAt,
        questoes: sessao.questoes.map(q => ({
          id: q.id,
          sessaoId: q.sessaoId,
          pergunta: q.pergunta,
          alternativaA: q.alternativaA,
          alternativaB: q.alternativaB,
          alternativaC: q.alternativaC,
          alternativaD: q.alternativaD,
          alternativaE: q.alternativaE || undefined,
          respostaCorreta: q.respostaCorreta,
          explicacao: q.explicacao || undefined,
          nivel: q.nivel || undefined,
          topico: q.topico || undefined,
          ordem: q.ordem,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        }))
      }
    } catch (error) {
      console.error('Erro ao criar sessão de questões:', error)
      throw new Error('Falha ao salvar sessão de questões')
    }
  }

  /**
   * Busca uma sessão de questões por ID
   */
  static async buscarSessao(id: string): Promise<SessaoQuestoes | null> {
    try {
      const sessao = await prisma.sessaoQuestoes.findUnique({
        where: { id },
        include: {
          questoes: {
            orderBy: { ordem: 'asc' },
            include: {
              respostas: true
            }
          }
        }
      })

      if (!sessao) return null

      return {
        id: sessao.id,
        materialId: sessao.materialId || undefined,
        disciplinaId: sessao.disciplinaId || undefined,
        titulo: sessao.titulo,
        descricao: sessao.descricao || undefined,
        prompt: sessao.prompt,
        totalQuestoes: sessao.totalQuestoes,
        createdAt: sessao.createdAt,
        updatedAt: sessao.updatedAt,
        questoes: sessao.questoes.map(q => ({
          id: q.id,
          sessaoId: q.sessaoId,
          pergunta: q.pergunta,
          alternativaA: q.alternativaA,
          alternativaB: q.alternativaB,
          alternativaC: q.alternativaC,
          alternativaD: q.alternativaD,
          alternativaE: q.alternativaE || undefined,
          respostaCorreta: q.respostaCorreta,
          explicacao: q.explicacao || undefined,
          nivel: q.nivel || undefined,
          topico: q.topico || undefined,
          ordem: q.ordem,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
          respostas: q.respostas.map(r => ({
            id: r.id,
            questaoId: r.questaoId,
            resposta: r.resposta,
            correto: r.correto,
            tempoGasto: r.tempoGasto || undefined,
            createdAt: r.createdAt,
          }))
        }))
      }
    } catch (error) {
      console.error('Erro ao buscar sessão:', error)
      throw new Error('Falha ao buscar sessão de questões')
    }
  }

  /**
   * Lista sessões de questões por material ou disciplina
   */
  static async listarSessoes(materialId?: string, disciplinaId?: string): Promise<SessaoQuestoes[]> {
    try {
      // Usar mesma lógica de filtro que o listarSessoesResumo
      let where: any = {}
      
      if (materialId && disciplinaId) {
        where = {
          OR: [
            { materialId: materialId },
            { disciplinaId: disciplinaId }
          ]
        }
      } else if (materialId) {
        where.materialId = materialId
      } else if (disciplinaId) {
        where.disciplinaId = disciplinaId
      }

      const sessoes = await prisma.sessaoQuestoes.findMany({
        where,
        include: {
          questoes: {
            orderBy: { ordem: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return sessoes.map(sessao => ({
        id: sessao.id,
        materialId: sessao.materialId || undefined,
        disciplinaId: sessao.disciplinaId || undefined,
        titulo: sessao.titulo,
        descricao: sessao.descricao || undefined,
        prompt: sessao.prompt,
        totalQuestoes: sessao.totalQuestoes,
        createdAt: sessao.createdAt,
        updatedAt: sessao.updatedAt,
        questoes: sessao.questoes.map(q => ({
          id: q.id,
          sessaoId: q.sessaoId,
          pergunta: q.pergunta,
          alternativaA: q.alternativaA,
          alternativaB: q.alternativaB,
          alternativaC: q.alternativaC,
          alternativaD: q.alternativaD,
          alternativaE: q.alternativaE || undefined,
          respostaCorreta: q.respostaCorreta,
          explicacao: q.explicacao || undefined,
          nivel: q.nivel || undefined,
          topico: q.topico || undefined,
          ordem: q.ordem,
          createdAt: q.createdAt,
          updatedAt: q.updatedAt,
        }))
      }))
    } catch (error) {
      console.error('Erro ao listar sessões:', error)
      throw new Error('Falha ao listar sessões de questões')
    }
  }

  /**
   * Salva resposta do usuário a uma questão
   */
  static async salvarResposta(request: SalvarRespostaRequest): Promise<void> {
    try {
      // Busca a questão para verificar se a resposta está correta
      const questao = await prisma.questao.findUnique({
        where: { id: request.questaoId }
      })

      if (!questao) {
        throw new Error('Questão não encontrada')
      }

      const correto = questao.respostaCorreta === request.resposta

      await prisma.respostaUsuario.create({
        data: {
          questaoId: request.questaoId,
          resposta: request.resposta,
          correto,
          tempoGasto: request.tempoGasto,
        }
      })
    } catch (error) {
      console.error('Erro ao salvar resposta:', error)
      throw new Error('Falha ao salvar resposta')
    }
  }

  /**
   * Gera estatísticas de uma sessão
   */
  static async gerarEstatisticas(sessaoId: string): Promise<EstatisticasSessao> {
    try {
      const sessao = await prisma.sessaoQuestoes.findUnique({
        where: { id: sessaoId },
        include: {
          questoes: {
            include: {
              respostas: true
            }
          }
        }
      })

      if (!sessao) {
        throw new Error('Sessão não encontrada')
      }

      const totalQuestoes = sessao.questoes.length
      const questoesComResposta = sessao.questoes.filter(q => q.respostas.length > 0)
      const questoesRespondidas = questoesComResposta.length
      
      const respostasCorretas = questoesComResposta.filter(q => 
        q.respostas.some(r => r.correto)
      ).length

      const tempoTotalGasto = questoesComResposta.reduce((total, questao) => {
        const tempoQuestao = questao.respostas.reduce((acc, resposta) => 
          acc + (resposta.tempoGasto || 0), 0
        )
        return total + tempoQuestao
      }, 0)

      const percentualAcerto = questoesRespondidas > 0 
        ? (respostasCorretas / questoesRespondidas) * 100 
        : 0

      return {
        sessaoId,
        totalQuestoes,
        questoesRespondidas,
        acertos: respostasCorretas,
        erros: questoesRespondidas - respostasCorretas,
        tempoTotalGasto,
        percentualAcerto: Math.round(percentualAcerto * 100) / 100
      }
    } catch (error) {
      console.error('Erro ao gerar estatísticas:', error)
      throw new Error('Falha ao gerar estatísticas')
    }
  }

  /**
   * Deleta uma sessão de questões
   */
  static async deletarSessao(id: string): Promise<void> {
    try {
      await prisma.sessaoQuestoes.delete({
        where: { id }
      })
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
      throw new Error('Falha ao deletar sessão de questões')
    }
  }

  /**
   * Lista sessões resumidas (sem questões) para seleção
   */
  static async listarSessoesResumo(materialId?: string, disciplinaId?: string): Promise<{
    id: string
    titulo: string
    descricao?: string
    totalQuestoes: number
    createdAt: Date
    ultimaRealizacao?: Date
    totalRealizacoes: number
  }[]> {
    try {
      // Priorizar materialId, senão usar disciplinaId, ou usar OR se ambos existirem
      let where: any = {}
      
      if (materialId && disciplinaId) {
        // Se ambos forem fornecidos, buscar sessões que pertencem ao material OU à disciplina
        where = {
          OR: [
            { materialId: materialId },
            { disciplinaId: disciplinaId }
          ]
        }
      } else if (materialId) {
        where.materialId = materialId
      } else if (disciplinaId) {
        where.disciplinaId = disciplinaId
      }

      const sessoes = await prisma.sessaoQuestoes.findMany({
        where,
        select: {
          id: true,
          titulo: true,
          descricao: true,
          totalQuestoes: true,
          createdAt: true,
          sessoesRealizadas: {
            select: {
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              sessoesRealizadas: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      return sessoes.map(sessao => ({
        id: sessao.id,
        titulo: sessao.titulo,
        descricao: sessao.descricao || undefined,
        totalQuestoes: sessao.totalQuestoes,
        createdAt: sessao.createdAt,
        ultimaRealizacao: sessao.sessoesRealizadas[0]?.createdAt,
        totalRealizacoes: sessao._count.sessoesRealizadas
      }))
    } catch (error) {
      console.error('Erro ao listar sessões resumo:', error)
      throw new Error('Falha ao listar sessões de questões')
    }
  }

  /**
   * Busca estatísticas de uma sessão específica
   */
  static async buscarEstatisticasSessao(sessaoId: string): Promise<{
    totalRealizacoes: number
    melhorPontuacao: number
    mediaPercentualAcerto: number
    ultimaRealizacao?: Date
  }> {
    try {
      const stats = await prisma.sessaoRealizada.aggregate({
        where: {
          sessaoQuestoesId: sessaoId,
          finalizada: true
        },
        _count: {
          id: true
        },
        _max: {
          pontuacao: true,
          createdAt: true
        },
        _avg: {
          percentualAcerto: true
        }
      })

      return {
        totalRealizacoes: stats._count.id || 0,
        melhorPontuacao: stats._max.pontuacao || 0,
        mediaPercentualAcerto: stats._avg.percentualAcerto || 0,
        ultimaRealizacao: stats._max.createdAt || undefined
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas da sessão:', error)
      throw new Error('Falha ao buscar estatísticas da sessão')
    }
  }
} 