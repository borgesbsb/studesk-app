import OpenAI from 'openai'

export interface BuildDisciplinaInput {
  id: string          // BuildPlanoDisciplina.id
  nome: string
  tipo: 'P1' | 'P2'
  conteudoEdital: string
  cargaHoraria: number
}

export interface AssuntoGerado {
  buildPlanoDisciplinaId: string
  nome: string
  ciclo: number
  ordem: number
}

export interface ResultadoGeracao {
  assuntos: AssuntoGerado[]
  tokensUsados: number
  modelo: string
}

export class BuildPlanoAIService {
  private groqClient: OpenAI | null = null
  private openaiClient: OpenAI | null = null

  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (groqApiKey) {
      this.groqClient = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
    }

    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey })
    }

    if (!this.groqClient && !this.openaiClient) {
      throw new Error('Nenhuma API key configurada (GROQ_API_KEY ou OPENAI_API_KEY)')
    }
  }

  async gerarDistribuicao(
    disciplinas: BuildDisciplinaInput[],
    numeroCiclos: number
  ): Promise<ResultadoGeracao> {
    const ciclosImpares = Array.from({ length: numeroCiclos }, (_, i) => i + 1).filter(n => n % 2 !== 0)
    const ciclosPares = Array.from({ length: numeroCiclos }, (_, i) => i + 1).filter(n => n % 2 === 0)

    const prompt = this.buildPrompt(disciplinas, numeroCiclos, ciclosImpares, ciclosPares)

    let response: OpenAI.Chat.ChatCompletion | null = null
    let modelo = ''

    // Tenta Groq primeiro (gratuito), depois OpenAI
    if (this.groqClient) {
      try {
        response = await this.groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 8000,
          response_format: { type: 'json_object' },
        })
        modelo = 'groq/llama-3.3-70b-versatile'
      } catch (err) {
        console.error('Groq falhou, tentando OpenAI:', err)
      }
    }

    if (!response && this.openaiClient) {
      response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      })
      modelo = 'openai/gpt-4o-mini'
    }

    if (!response) {
      throw new Error('Falha ao chamar API de IA')
    }

    const content = response.choices[0]?.message?.content || ''
    const tokensUsados = response.usage?.total_tokens || 0

    const assuntos = this.parseResposta(content, disciplinas)

    return { assuntos, tokensUsados, modelo }
  }

  private buildPrompt(
    disciplinas: BuildDisciplinaInput[],
    numeroCiclos: number,
    ciclosImpares: number[],
    ciclosPares: number[]
  ): string {
    const discP1 = disciplinas.filter(d => d.tipo === 'P1')
    const discP2 = disciplinas.filter(d => d.tipo === 'P2')

    const formatarDisciplina = (d: BuildDisciplinaInput) =>
      `### ${d.nome} (${d.tipo}, ${d.cargaHoraria}h)
ID: ${d.id}
Conteúdo do edital:
${d.conteudoEdital || '(sem conteúdo informado)'}`

    return `Você é um especialista em planejamento de estudos para concursos públicos.

## Tarefa
Analise o conteúdo do edital de cada disciplina abaixo e distribua os assuntos (tópicos) entre os ciclos de estudo.

## Regras OBRIGATÓRIAS
- Total de ciclos: ${numeroCiclos}
- Disciplinas P1 → SOMENTE ciclos ÍMPARES: ${ciclosImpares.join(', ')}
- Disciplinas P2 → SOMENTE ciclos PARES: ${ciclosPares.join(', ')}
- Distribua os assuntos de forma equilibrada, considerando a carga horária e volume de conteúdo
- Assuntos mais importantes ou extensos podem aparecer em mais de um ciclo (repetição para revisão)
- Cada assunto deve ser uma string concisa (máximo 100 caracteres)
- Extraia os assuntos DIRETAMENTE do conteúdo do edital fornecido
- Se o conteúdo do edital for vago, crie tópicos razoáveis baseados na disciplina

## Disciplinas P1 (ciclos ímpares: ${ciclosImpares.join(', ')})
${discP1.map(formatarDisciplina).join('\n\n')}

## Disciplinas P2 (ciclos pares: ${ciclosPares.join(', ')})
${discP2.map(formatarDisciplina).join('\n\n')}

## Formato de resposta (JSON obrigatório)
Retorne um JSON com exatamente este formato:
{
  "distribuicao": [
    {
      "buildPlanoDisciplinaId": "<ID exato da disciplina>",
      "assuntos": [
        { "nome": "<nome do assunto>", "ciclo": <número do ciclo>, "ordem": <ordem dentro do ciclo 1,2,3...> },
        ...
      ]
    },
    ...
  ]
}

IMPORTANTE: Use os IDs exatos fornecidos para cada disciplina. Não invente IDs.`
  }

  private parseResposta(
    content: string,
    disciplinas: BuildDisciplinaInput[]
  ): AssuntoGerado[] {
    let json: any

    try {
      json = JSON.parse(content)
    } catch {
      // Tenta extrair JSON do texto
      const match = content.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Resposta da IA não contém JSON válido')
      json = JSON.parse(match[0])
    }

    const distribuicao: any[] = json.distribuicao || []
    const idsValidos = new Set(disciplinas.map(d => d.id))
    const assuntos: AssuntoGerado[] = []

    for (const item of distribuicao) {
      const discId = item.buildPlanoDisciplinaId
      if (!idsValidos.has(discId)) {
        console.warn(`ID desconhecido na resposta da IA: ${discId}`)
        continue
      }

      const disc = disciplinas.find(d => d.id === discId)!
      const ciclosPermitidos = disc.tipo === 'P1'
        ? Array.from({ length: 99 }, (_, i) => i * 2 + 1) // ímpares
        : Array.from({ length: 99 }, (_, i) => (i + 1) * 2) // pares

      for (const assunto of (item.assuntos || [])) {
        if (!assunto.nome || !assunto.ciclo) continue
        if (!ciclosPermitidos.includes(assunto.ciclo)) {
          console.warn(`Ciclo ${assunto.ciclo} inválido para ${disc.tipo}: ${assunto.nome}`)
          continue
        }

        assuntos.push({
          buildPlanoDisciplinaId: discId,
          nome: String(assunto.nome).substring(0, 200),
          ciclo: Number(assunto.ciclo),
          ordem: Number(assunto.ordem) || 0,
        })
      }
    }

    return assuntos
  }
}
