import OpenAI from 'openai'

export interface GabaritoProcessado {
  questoes: {
    numero: number
    respostaOficial: string
    respostaUsuario: string
    acertou: boolean | null
  }[]
}

export interface GabaritoExtraido {
  questoes: {
    numero: number
    resposta: string
  }[]
}

export interface IntervaloQuestao {
  questaoInicio: number
  questaoFim: number
}

type AIProvider = 'groq' | 'openai'

export class GabaritoService {
  private groqClient: OpenAI | null = null
  private openaiClient: OpenAI | null = null
  private primaryProvider: AIProvider

  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    // Configurar Groq se a chave estiver disponível (para modelos de texto)
    if (groqApiKey) {
      this.groqClient = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      console.log('✅ [Gabarito] Groq configurado')
    }

    // Configurar OpenAI se a chave estiver disponível
    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey })
      console.log('✅ [Gabarito] OpenAI configurado')
    }

    // Groq descontinuou modelos de visão, usar OpenAI como primário
    if (this.openaiClient) {
      this.primaryProvider = 'openai'
    } else if (this.groqClient) {
      this.primaryProvider = 'groq'
    } else {
      throw new Error('Nenhuma API key configurada (GROQ_API_KEY ou OPENAI_API_KEY)')
    }

    console.log(`🎯 [Gabarito] Provider primário: ${this.primaryProvider}`)
  }

  /**
   * Extrai APENAS o gabarito oficial - usuário preencherá suas respostas manualmente
   * @param gabaritoOficialFile - Arquivo do gabarito oficial
   * @param intervalos - Array de intervalos de questões
   * @returns Gabarito oficial extraído
   */
  async extrairGabaritoOficial(
    gabaritoOficialFile: File,
    intervalos: IntervaloQuestao[]
  ): Promise<GabaritoExtraido> {
    console.log(`[Gabarito] Extraindo APENAS gabarito oficial - ${intervalos.length} intervalos`)

    const oficialBase64 = await this.fileToBase64(gabaritoOficialFile)

    const gabaritoOficial = await this.extrairGabarito(
      oficialBase64,
      gabaritoOficialFile.type,
      intervalos,
      'OFICIAL'
    )

    console.log('[Gabarito] ✅ Extração do gabarito oficial concluída')
    console.log(`[Gabarito] Total de questões extraídas: ${gabaritoOficial.questoes.length}`)

    return gabaritoOficial
  }

  /**
   * Extrai gabaritos SEM comparar - retorna dados brutos para edição pelo usuário
   * @param gabaritoOficialFile - Arquivo do gabarito oficial
   * @param gabaritoUsuarioFile - Arquivo do gabarito do usuário
   * @param intervalos - Array de intervalos de questões
   * @returns Gabaritos extraídos (oficial e usuário) sem comparação
   */
  async extrairGabaritosSemComparar(
    gabaritoOficialFile: File,
    gabaritoUsuarioFile: File,
    intervalos: IntervaloQuestao[]
  ): Promise<{ oficial: GabaritoExtraido; usuario: GabaritoExtraido }> {
    console.log(`[Gabarito] Extraindo ${intervalos.length} intervalos (SEM comparar)`)

    const oficialBase64 = await this.fileToBase64(gabaritoOficialFile)
    const usuarioBase64 = await this.fileToBase64(gabaritoUsuarioFile)

    // Extrair ambos em paralelo para ser mais rápido
    const [gabaritoOficial, gabaritoUsuario] = await Promise.all([
      this.extrairGabarito(oficialBase64, gabaritoOficialFile.type, intervalos, 'OFICIAL'),
      this.extrairGabarito(usuarioBase64, gabaritoUsuarioFile.type, intervalos, 'USUARIO')
    ])

    console.log('[Gabarito] ✅ Extração concluída - aguardando edição do usuário')

    return {
      oficial: gabaritoOficial,
      usuario: gabaritoUsuario
    }
  }

  /**
   * Processa gabaritos já extraídos e editados pelo usuário
   * @param oficial - Gabarito oficial (possivelmente editado)
   * @param usuario - Gabarito do usuário (possivelmente editado)
   * @returns Resultado da comparação
   */
  async processarGabaritosEditados(
    oficial: GabaritoExtraido,
    usuario: GabaritoExtraido
  ): Promise<GabaritoProcessado> {
    console.log('[Gabarito] Processando gabaritos editados pelo usuário')

    const questoesComparadas = this.compararGabaritos(oficial, usuario)

    console.log(`[Gabarito] Total de questões: ${questoesComparadas.length}`)
    console.log(`[Gabarito] Acertos: ${questoesComparadas.filter(q => q.acertou === true).length}`)
    console.log(`[Gabarito] Erros: ${questoesComparadas.filter(q => q.acertou === false).length}`)

    return { questoes: questoesComparadas }
  }

  /**
   * Processa MÚLTIPLOS intervalos de questões em uma única chamada (OTIMIZADO)
   * @param gabaritoOficialFile - Arquivo do gabarito oficial (PDF ou imagem)
   * @param gabaritoUsuarioFile - Arquivo do gabarito do usuário (PDF ou imagem)
   * @param intervalos - Array de intervalos de questões para processar
   */
  async processarGabaritosBatch(
    gabaritoOficialFile: File,
    gabaritoUsuarioFile: File,
    intervalos: IntervaloQuestao[]
  ): Promise<GabaritoProcessado> {
    console.log(`[Gabarito] Processando ${intervalos.length} intervalos em batch`)
    console.log(`[Gabarito] Arquivo oficial: ${gabaritoOficialFile.name} (${gabaritoOficialFile.type})`)
    console.log(`[Gabarito] Arquivo usuário: ${gabaritoUsuarioFile.name} (${gabaritoUsuarioFile.type})`)

    // Converter arquivos para base64 (para enviar à IA)
    const oficialBase64 = await this.fileToBase64(gabaritoOficialFile)
    const usuarioBase64 = await this.fileToBase64(gabaritoUsuarioFile)

    // ===== PASSO 1: EXTRAIR GABARITO OFICIAL =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Gabarito] PASSO 1: Extraindo GABARITO OFICIAL...')
    console.log('[Gabarito] Arquivo: ', gabaritoOficialFile.name)
    const gabaritoOficial = await this.extrairGabarito(
      oficialBase64,
      gabaritoOficialFile.type,
      intervalos,
      'OFICIAL'
    )
    console.log('[Gabarito] ✅ Gabarito OFICIAL extraído:', gabaritoOficial.questoes.slice(0, 5))

    // ===== PASSO 2: EXTRAIR GABARITO DO USUÁRIO =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Gabarito] PASSO 2: Extraindo GABARITO DO USUÁRIO...')
    console.log('[Gabarito] Arquivo: ', gabaritoUsuarioFile.name)
    const gabaritoUsuario = await this.extrairGabarito(
      usuarioBase64,
      gabaritoUsuarioFile.type,
      intervalos,
      'USUARIO'
    )
    console.log('[Gabarito] ✅ Gabarito USUÁRIO extraído:', gabaritoUsuario.questoes.slice(0, 5))

    // ===== PASSO 3: COMPARAR NO CÓDIGO =====
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('[Gabarito] PASSO 3: Comparando gabaritos...')
    console.log('[Gabarito] Oficial tem', gabaritoOficial.questoes.length, 'questões')
    console.log('[Gabarito] Usuário tem', gabaritoUsuario.questoes.length, 'questões')

    const questoesComparadas = this.compararGabaritos(gabaritoOficial, gabaritoUsuario)

    console.log('[Gabarito] ✅ Comparação concluída - primeiras 5 questões:')
    questoesComparadas.slice(0, 5).forEach(q => {
      console.log(`  Q${q.numero}: Oficial="${q.respostaOficial}" | Usuário="${q.respostaUsuario}" | Acertou=${q.acertou}`)
    })

    console.log(`[Gabarito] Total de questões processadas: ${questoesComparadas.length}`)
    console.log(`[Gabarito] Acertos: ${questoesComparadas.filter(q => q.acertou === true).length}`)
    console.log(`[Gabarito] Erros: ${questoesComparadas.filter(q => q.acertou === false).length}`)
    console.log(`[Gabarito] Não respondidas: ${questoesComparadas.filter(q => q.acertou === null).length}`)

    return { questoes: questoesComparadas }
  }

  /**
   * Processa os gabaritos e compara as respostas (suporta PDF e imagens)
   * @param gabaritoOficialFile - Arquivo do gabarito oficial (PDF ou imagem)
   * @param gabaritoUsuarioFile - Arquivo do gabarito do usuário (PDF ou imagem)
   * @param questaoInicio - Número da primeira questão
   * @param questaoFim - Número da última questão
   */
  async processarGabaritos(
    gabaritoOficialFile: File,
    gabaritoUsuarioFile: File,
    questaoInicio: number,
    questaoFim: number
  ): Promise<GabaritoProcessado> {
    console.log(`[Gabarito] Processando questões ${questaoInicio} a ${questaoFim}`)
    console.log(`[Gabarito] Arquivo oficial: ${gabaritoOficialFile.name} (${gabaritoOficialFile.type})`)
    console.log(`[Gabarito] Arquivo usuário: ${gabaritoUsuarioFile.name} (${gabaritoUsuarioFile.type})`)

    // Converter arquivos para base64
    const oficialBase64 = await this.fileToBase64(gabaritoOficialFile)
    const usuarioBase64 = await this.fileToBase64(gabaritoUsuarioFile)

    const intervalos: IntervaloQuestao[] = [{ questaoInicio, questaoFim }]

    // PASSO 1: Extrair gabarito oficial
    console.log('[Gabarito] Extraindo gabarito oficial...')
    const gabaritoOficial = await this.extrairGabarito(
      oficialBase64,
      gabaritoOficialFile.type,
      intervalos,
      'OFICIAL'
    )

    // PASSO 2: Extrair gabarito do usuário
    console.log('[Gabarito] Extraindo gabarito do usuário...')
    const gabaritoUsuario = await this.extrairGabarito(
      usuarioBase64,
      gabaritoUsuarioFile.type,
      intervalos,
      'USUARIO'
    )

    // PASSO 3: Comparar no código
    console.log('[Gabarito] Comparando respostas...')
    const questoesComparadas = this.compararGabaritos(gabaritoOficial, gabaritoUsuario)

    console.log(`[Gabarito] Processadas ${questoesComparadas.length} questões`)
    console.log(`[Gabarito] Acertos: ${questoesComparadas.filter(q => q.acertou === true).length}`)
    console.log(`[Gabarito] Erros: ${questoesComparadas.filter(q => q.acertou === false).length}`)
    console.log(`[Gabarito] Não respondidas: ${questoesComparadas.filter(q => q.acertou === null).length}`)

    return { questoes: questoesComparadas }
  }

  /**
   * Extrai respostas de UM gabarito (oficial ou usuário)
   */
  private async extrairGabarito(
    imagemBase64: string,
    imagemType: string,
    intervalos: IntervaloQuestao[],
    tipo: 'OFICIAL' | 'USUARIO'
  ): Promise<GabaritoExtraido> {
    console.log(`[Extrair] Iniciando extração do gabarito: ${tipo}`)

    const intervalosStr = intervalos.map((int, idx) =>
      `${idx + 1}. Questões ${int.questaoInicio} até ${int.questaoFim}`
    ).join('\n')

    const prompt = tipo === 'OFICIAL'
      ? this.gerarPromptGabaritoOficial(intervalosStr)
      : this.gerarPromptGabaritoUsuario(intervalosStr)

    console.log(`[Extrair] Prompt tipo: ${tipo}`)
    console.log(`[Extrair] Intervalos solicitados: ${intervalosStr}`)

    try {
      const response = await this.callAIWithImage(prompt, imagemBase64, imagemType)

      console.log(`[Extrair] Resposta da IA para ${tipo} (primeiros 200 chars):`, response.substring(0, 200))

      const jsonMatch = response.match(/\{[\s\S]*\}/)

      if (!jsonMatch) {
        throw new Error('Resposta da IA não contém JSON válido')
      }

      const resultado: GabaritoExtraido = JSON.parse(jsonMatch[0])

      console.log(`[Extrair] ${tipo}: Extraídas ${resultado.questoes.length} questões`)
      console.log(`[Extrair] ${tipo} - Primeiras 5 questões:`, resultado.questoes.slice(0, 5))

      return resultado

    } catch (error) {
      console.error(`[Gabarito] Erro ao extrair ${tipo}:`, error)
      throw new Error(`Erro ao extrair gabarito ${tipo}: ${(error as Error).message}`)
    }
  }

  /**
   * Compara dois gabaritos e determina acertos/erros (NO CÓDIGO)
   * @param oficial - Gabarito OFICIAL extraído (respostas corretas)
   * @param usuario - Gabarito do USUÁRIO extraído (respostas marcadas)
   */
  private compararGabaritos(
    oficial: GabaritoExtraido,
    usuario: GabaritoExtraido
  ): Array<{
    numero: number
    respostaOficial: string
    respostaUsuario: string
    acertou: boolean | null
  }> {
    console.log('[Comparar] Iniciando comparação...')
    console.log('[Comparar] Gabarito OFICIAL (primeiras 3):', oficial.questoes.slice(0, 3))
    console.log('[Comparar] Gabarito USUÁRIO (primeiras 3):', usuario.questoes.slice(0, 3))

    const resultado = []

    // Criar um mapa do gabarito do usuário para acesso rápido
    const usuarioMap = new Map(
      usuario.questoes.map(q => [q.numero, q.resposta])
    )

    for (const questaoOficial of oficial.questoes) {
      const respostaUsuario = usuarioMap.get(questaoOficial.numero) || 'N'

      let acertou: boolean | null

      // Questão não respondida
      if (respostaUsuario === 'N') {
        acertou = null
      }
      // Questão anulada (todos acertam)
      else if (questaoOficial.resposta === 'ANULADA') {
        acertou = true
      }
      // Comparar letras
      else {
        acertou = questaoOficial.resposta === respostaUsuario
      }

      // IMPORTANTE: Manter a ordem correta!
      // respostaOficial = do gabarito OFICIAL
      // respostaUsuario = do gabarito do USUÁRIO
      resultado.push({
        numero: questaoOficial.numero,
        respostaOficial: questaoOficial.resposta,  // ← OFICIAL
        respostaUsuario: respostaUsuario,          // ← USUÁRIO
        acertou
      })
    }

    console.log('[Comparar] Resultado (primeiras 3 comparações):')
    resultado.slice(0, 3).forEach(r => {
      console.log(`  Q${r.numero}: OFICIAL=${r.respostaOficial} vs USUÁRIO=${r.respostaUsuario} → ${r.acertou ? '✅' : r.acertou === false ? '❌' : '⚪'}`)
    })

    return resultado
  }

  /**
   * Gera prompt para extrair GABARITO OFICIAL
   */
  private gerarPromptGabaritoOficial(intervalosStr: string): string {
    return `Você é um especialista em OCR de gabaritos.

TAREFA:
Extraia as respostas corretas do gabarito oficial para as seguintes questões:
${intervalosStr}

DESCRIÇÃO DA IMAGEM:
- Documento com gabarito oficial da prova
- Formato: lista ou tabela com número da questão e letra da resposta
- Exemplo: "1. A", "2. C", "3. ANULADA"

O QUE FAZER:
1. Para cada questão, encontre o número
2. Identifique a letra ao lado (A, B, C, D, E ou ANULADA)
3. Se a questão foi anulada, use "ANULADA"

FORMATO DE SAÍDA:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "C" },
    { "numero": 3, "resposta": "ANULADA" }
  ]
}

Retorne APENAS o JSON, sem texto adicional.`
  }

  /**
   * Gera prompt para extrair GABARITO DO USUÁRIO
   */
  private gerarPromptGabaritoUsuario(intervalosStr: string): string {
    return `Você é um especialista em OCR de folhas de respostas de provas (gabaritos).

TAREFA:
Analise a folha de respostas e identifique quais opções foram marcadas pelo aluno.

Para as questões:
${intervalosStr}

DESCRIÇÃO DA IMAGEM:
- Folha de respostas de prova (cartão resposta)
- Cada linha representa UMA questão numerada (1, 2, 3, etc.)
- Cada questão tem 5 bolinhas/círculos dispostos HORIZONTALMENTE em linha
- As bolinhas representam as alternativas na ordem: A, B, C, D, E (da esquerda para direita)
- O aluno marca sua resposta preenchendo UMA das bolinhas (geralmente com caneta azul ou preta)

O QUE FAZER:
1. Localize o número da questão na primeira coluna
2. Observe as 5 bolinhas dispostas horizontalmente após o número
3. Identifique qual bolinha está PREENCHIDA/PINTADA (as outras estarão vazias/brancas)
4. A posição da bolinha preenchida indica a resposta:
   - 1ª bolinha (esquerda) = A
   - 2ª bolinha = B
   - 3ª bolinha = C
   - 4ª bolinha = D
   - 5ª bolinha (direita) = E
5. Se NENHUMA bolinha foi marcada na questão, use "N"

ATENÇÃO:
- As bolinhas estão em LINHA HORIZONTAL (não em coluna vertical)
- Olhe com atenção: bolinhas preenchidas podem ter cor azul, preta ou cinza
- Compare com as bolinhas vazias ao redor para identificar qual está marcada
- Ignore marcações fora das bolinhas ou rasuras

FORMATO DE SAÍDA:
{
  "questoes": [
    { "numero": 1, "resposta": "A" },
    { "numero": 2, "resposta": "B" },
    { "numero": 3, "resposta": "C" }
  ]
}

Retorne APENAS o JSON, sem texto adicional.`
  }

  /**
   * Converte File para base64
   */
  private async fileToBase64(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString('base64')
  }

  /**
   * Determina o tipo MIME da imagem
   */
  private getMimeType(fileType: string): string {
    if (fileType.includes('pdf')) return 'application/pdf'
    if (fileType.includes('jpeg') || fileType.includes('jpg')) return 'image/jpeg'
    if (fileType.includes('png')) return 'image/png'
    return 'image/jpeg' // default
  }

  /**
   * Sleep/delay helper
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Chama a IA com UMA imagem
   */
  private async callAIWithImage(
    prompt: string,
    imagemBase64: string,
    imagemType: string,
    retryCount = 0
  ): Promise<string> {
    const client = this.openaiClient
    const model = 'gpt-4o'  // ✨ Trocado de gpt-4o-mini para gpt-4o (mais preciso)
    const MAX_RETRIES = 5
    const BASE_DELAY = 1000

    if (!client) {
      throw new Error('OpenAI client não disponível')
    }

    try {
      console.log(`[Gabarito] 🚀 Chamando OpenAI ${model} (modelo completo) - tentativa ${retryCount + 1}`)

      const messages: any[] = [
        {
          role: 'system',
          content: 'Você é um assistente especializado em OCR e extração de gabaritos. Sempre retorne JSON válido.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${this.getMimeType(imagemType)};base64,${imagemBase64}`
              }
            }
          ]
        }
      ]

      const completion = await client.chat.completions.create({
        model,
        messages,
        temperature: 0,
        max_tokens: 4000,
        response_format: { type: "json_object" }
      })

      const result = completion.choices[0]?.message?.content || ''

      if (!result) {
        throw new Error('Resposta vazia da IA')
      }

      return result

    } catch (error: any) {
      console.error(`[Gabarito] Erro ao chamar OpenAI:`, error)

      // Rate limit com retry
      if (error.status === 429 && retryCount < MAX_RETRIES) {
        let delayMs = BASE_DELAY * Math.pow(2, retryCount)

        if (error.headers && error.headers['retry-after-ms']) {
          delayMs = parseInt(error.headers['retry-after-ms'], 10)
        } else if (error.headers && error.headers['retry-after']) {
          delayMs = parseInt(error.headers['retry-after'], 10) * 1000
        }

        const jitter = delayMs * 0.25 * (Math.random() * 2 - 1)
        delayMs = Math.floor(delayMs + jitter)

        console.log(`[Gabarito] Rate limit. Aguardando ${delayMs}ms (tentativa ${retryCount + 1}/${MAX_RETRIES})`)

        await this.sleep(delayMs)
        return this.callAIWithImage(prompt, imagemBase64, imagemType, retryCount + 1)
      }

      throw error
    }
  }
}
