import { QuestaoRequest, QuestaoResponse } from "@/domain/entities/Questao"

export class QuestoesService {
  private static readonly API_URL = process.env.NEXT_PUBLIC_API_URL || ''
  private static readonly ENDPOINT = '/api/questoes/gerar'

  private static gerarQuestoesTeste(paragrafo: string): QuestaoResponse {
    // Extrai algumas palavras-chave do parágrafo para usar nas questões
    const palavrasChave = paragrafo
      .split(/\s+/)
      .filter(palavra => palavra.length > 4)
      .slice(0, 5)

    const questoes = [
      {
        enunciado: `De acordo com o texto, qual é a principal ideia relacionada a "${palavrasChave[0]}"?`,
        alternativas: [
          {
            texto: `O texto destaca a importância de ${palavrasChave[0]} no contexto apresentado.`,
            correta: true,
            explicacao: "Esta alternativa está correta pois reflete diretamente o que é discutido no texto sobre o tema principal."
          },
          {
            texto: `${palavrasChave[0]} não tem relação com o assunto principal do texto.`,
            correta: false
          },
          {
            texto: `O texto critica o conceito de ${palavrasChave[0]} de forma veemente.`,
            correta: false
          },
          {
            texto: `${palavrasChave[0]} é mencionado apenas como exemplo secundário.`,
            correta: false
          }
        ],
        paragrafoPai: paragrafo
      },
      {
        enunciado: `Qual a relação entre ${palavrasChave[1]} e ${palavrasChave[2]} apresentada no texto?`,
        alternativas: [
          {
            texto: "Não há relação direta entre os conceitos.",
            correta: false
          },
          {
            texto: `${palavrasChave[1]} contradiz ${palavrasChave[2]}.`,
            correta: false
          },
          {
            texto: `${palavrasChave[1]} complementa e expande o conceito de ${palavrasChave[2]}.`,
            correta: true,
            explicacao: "O texto estabelece uma clara relação de complementaridade entre os conceitos apresentados."
          },
          {
            texto: "Os conceitos são apresentados como opostos.",
            correta: false
          }
        ],
        paragrafoPai: paragrafo
      },
      {
        enunciado: "Com base no texto, qual das seguintes afirmações está correta?",
        alternativas: [
          {
            texto: "O texto não apresenta evidências suficientes para suas conclusões.",
            correta: false
          },
          {
            texto: `A análise de ${palavrasChave[3]} é superficial e incompleta.`,
            correta: false
          },
          {
            texto: `O texto demonstra uma abordagem equilibrada sobre ${palavrasChave[3]}.`,
            correta: true,
            explicacao: "Esta alternativa reflete corretamente a abordagem metodológica apresentada no texto."
          },
          {
            texto: `${palavrasChave[3]} é um conceito controverso no texto.`,
            correta: false
          }
        ],
        paragrafoPai: paragrafo
      }
    ]

    return {
      questoes,
      status: 'success'
    }
  }

  static async gerarQuestoes(request: QuestaoRequest, apiKey?: string): Promise<QuestaoResponse> {
    try {
      // Se não houver chave da API, retorna questões de teste
      if (!apiKey) {
        return this.gerarQuestoesTeste(request.paragrafo)
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (apiKey) {
        headers['x-openai-key'] = apiKey
      }

      const response = await fetch(`${this.API_URL}${this.ENDPOINT}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Falha ao gerar questões')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Erro ao gerar questões:', error)
      return {
        questoes: [],
        status: 'error',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }

  static async validarQuestao(questaoId: string, alternativaId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_URL}/api/questoes/${questaoId}/validar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ alternativaId }),
      })

      if (!response.ok) {
        throw new Error('Falha ao validar questão')
      }

      const data = await response.json()
      return data.correta
    } catch (error) {
      console.error('Erro ao validar questão:', error)
      return false
    }
  }
} 