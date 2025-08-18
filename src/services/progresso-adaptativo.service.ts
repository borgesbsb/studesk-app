import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export type NivelDificuldade = 'FACIL' | 'MEDIO' | 'DIFICIL'

export interface ProgressoAdaptativo {
  id: string
  materialId: string
  nivelAtual: NivelDificuldade
  totalSessoes: number
  ultimaPontuacao?: number
  ultimoPercentual?: number
  podeAvancar: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StatusProgresso {
  nivelAtual: NivelDificuldade
  proximoNivel?: NivelDificuldade
  podeAvancar: boolean
  totalSessoes: number
  mensagem: string
}

export class ProgressoAdaptativoService {
  
  /**
   * Busca ou cria o progresso adaptativo para um material
   */
  static async buscarOuCriarProgresso(materialId: string): Promise<ProgressoAdaptativo> {
    try {
      let progresso = await prisma.progressoAdaptativo.findUnique({
        where: { materialId }
      })

      if (!progresso) {
        progresso = await prisma.progressoAdaptativo.create({
          data: {
            materialId,
            nivelAtual: 'FACIL',
            totalSessoes: 0,
            podeAvancar: true
          }
        })
      }

      return {
        id: progresso.id,
        materialId: progresso.materialId,
        nivelAtual: progresso.nivelAtual as NivelDificuldade,
        totalSessoes: progresso.totalSessoes,
        ultimaPontuacao: progresso.ultimaPontuacao || undefined,
        ultimoPercentual: progresso.ultimoPercentual || undefined,
        podeAvancar: progresso.podeAvancar,
        createdAt: progresso.createdAt,
        updatedAt: progresso.updatedAt
      }
    } catch (error) {
      console.error('Erro ao buscar/criar progresso:', error)
      throw new Error('Falha ao gerenciar progresso adaptativo')
    }
  }

  /**
   * Atualiza o progresso após uma sessão
   */
  static async atualizarProgresso(
    materialId: string, 
    pontuacao: number, 
    percentualAcerto: number
  ): Promise<StatusProgresso> {
    try {
      const progressoAtual = await this.buscarOuCriarProgresso(materialId)
      
      // Determinar se pode avançar (70% ou mais)
      const podeAvancar = percentualAcerto >= 70
      
      // Determinar próximo nível
      let novoNivel = progressoAtual.nivelAtual
      let proximoNivel: NivelDificuldade | undefined
      
      if (podeAvancar && progressoAtual.podeAvancar) {
        switch (progressoAtual.nivelAtual) {
          case 'FACIL':
            novoNivel = 'MEDIO'
            proximoNivel = 'DIFICIL'
            break
          case 'MEDIO':
            novoNivel = 'DIFICIL'
            proximoNivel = undefined
            break
          case 'DIFICIL':
            // Já no nível máximo
            proximoNivel = undefined
            break
        }
      } else {
        // Se não atingiu 70%, continua no mesmo nível
        switch (progressoAtual.nivelAtual) {
          case 'FACIL':
            proximoNivel = 'MEDIO'
            break
          case 'MEDIO':
            proximoNivel = 'DIFICIL'
            break
          case 'DIFICIL':
            proximoNivel = undefined
            break
        }
      }

      // Atualizar no banco
      await prisma.progressoAdaptativo.update({
        where: { materialId },
        data: {
          nivelAtual: novoNivel,
          totalSessoes: progressoAtual.totalSessoes + 1,
          ultimaPontuacao: pontuacao,
          ultimoPercentual: percentualAcerto,
          podeAvancar: podeAvancar
        }
      })

      // Gerar mensagem de feedback
      let mensagem = ''
      if (podeAvancar && novoNivel !== progressoAtual.nivelAtual) {
        mensagem = `🎉 Parabéns! Você avançou para o nível ${this.getNomeNivel(novoNivel)}!`
      } else if (podeAvancar) {
        mensagem = `✅ Ótimo desempenho! Continue no nível ${this.getNomeNivel(novoNivel)}.`
      } else {
        mensagem = `📚 Continue praticando no nível ${this.getNomeNivel(novoNivel)} para avançar.`
      }

      return {
        nivelAtual: novoNivel,
        proximoNivel,
        podeAvancar,
        totalSessoes: progressoAtual.totalSessoes + 1,
        mensagem
      }
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
      throw new Error('Falha ao atualizar progresso adaptativo')
    }
  }

  /**
   * Gera prompt personalizado baseado no nível de dificuldade
   */
  static gerarPromptPorNivel(nivel: NivelDificuldade, contexto: string): string {
    const basePrompt = `Com base no seguinte texto sobre estudos:\n\n${contexto}\n\n`
    
    switch (nivel) {
      case 'FACIL':
        return basePrompt + `Gere EXATAMENTE 5 questões de múltipla escolha de nível FÁCIL sobre o conteúdo.
        
        Características das questões FÁCEIS:
        - Conceitos básicos e definições diretas
        - Informações explícitas no texto
        - Alternativas claras e distintas
        - Não requer análise complexa ou inferências avançadas
        
        Para cada questão, forneça:
        - Pergunta clara e objetiva
        - 4 alternativas (A, B, C, D)
        - Resposta correta
        - Explicação breve
        
        Formato JSON obrigatório: [{"pergunta": "...", "alternativaA": "...", "alternativaB": "...", "alternativaC": "...", "alternativaD": "...", "respostaCorreta": "A", "explicacao": "..."}]`

      case 'MEDIO':
        return basePrompt + `Gere EXATAMENTE 5 questões de múltipla escolha de nível MÉDIO sobre o conteúdo.
        
        Características das questões MÉDIAS:
        - Aplicação de conceitos em situações práticas
        - Requer compreensão e interpretação
        - Relacionamento entre diferentes partes do conteúdo
        - Algumas inferências lógicas necessárias
        
        Para cada questão, forneça:
        - Pergunta que exige análise
        - 4 alternativas (A, B, C, D)
        - Resposta correta
        - Explicação detalhada
        
        Formato JSON obrigatório: [{"pergunta": "...", "alternativaA": "...", "alternativaB": "...", "alternativaC": "...", "alternativaD": "...", "respostaCorreta": "A", "explicacao": "..."}]`

      case 'DIFICIL':
        return basePrompt + `Gere EXATAMENTE 5 questões de múltipla escolha de nível DIFÍCIL sobre o conteúdo.
        
        Características das questões DIFÍCEIS:
        - Análise crítica e avaliação complexa
        - Síntese de múltiplos conceitos
        - Aplicação em cenários complexos e não óbvios
        - Requer raciocínio avançado e inferências complexas
        - Alternativas com sutilezas e pegadinhas
        
        Para cada questão, forneça:
        - Pergunta complexa que exige análise profunda
        - 4 alternativas (A, B, C, D)
        - Resposta correta
        - Explicação detalhada e fundamentada
        
        Formato JSON obrigatório: [{"pergunta": "...", "alternativaA": "...", "alternativaB": "...", "alternativaC": "...", "alternativaD": "...", "respostaCorreta": "A", "explicacao": "..."}]`

      default:
        return basePrompt + `Gere 5 questões de múltipla escolha sobre o conteúdo.`
    }
  }

  /**
   * Converte nível para nome amigável
   */
  static getNomeNivel(nivel: NivelDificuldade): string {
    switch (nivel) {
      case 'FACIL': return 'Fácil'
      case 'MEDIO': return 'Médio'
      case 'DIFICIL': return 'Difícil'
      default: return 'Desconhecido'
    }
  }

  /**
   * Converte nível para emoji
   */
  static getEmojiNivel(nivel: NivelDificuldade): string {
    switch (nivel) {
      case 'FACIL': return '🌱'
      case 'MEDIO': return '🌿'
      case 'DIFICIL': return '🌳'
      default: return '❓'
    }
  }

  /**
   * Converte nível para cor
   */
  static getCorNivel(nivel: NivelDificuldade): string {
    switch (nivel) {
      case 'FACIL': return 'text-green-600'
      case 'MEDIO': return 'text-yellow-600'
      case 'DIFICIL': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }
} 