import OpenAI from 'openai'

export interface FormatTextResult {
  formattedText: string
  tokensUsed: number
  model: string
}

type AIProvider = 'groq' | 'openai'

export class OpenAIFormatService {
  private groqClient: OpenAI | null = null
  private openaiClient: OpenAI | null = null
  private primaryProvider: AIProvider

  constructor() {
    const groqApiKey = process.env.GROQ_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY

    // Configurar Groq se a chave estiver disponível (API GRATUITA - 14,400 req/dia)
    if (groqApiKey) {
      this.groqClient = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      })
      console.log('✅ Groq configurado como provider primário (GRATUITO)')
    }

    // Configurar OpenAI se a chave estiver disponível
    if (openaiApiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiApiKey })
      console.log('✅ OpenAI configurado como provider de fallback')
    }

    // Definir provider primário
    if (this.groqClient) {
      this.primaryProvider = 'groq'
    } else if (this.openaiClient) {
      this.primaryProvider = 'openai'
    } else {
      throw new Error('Nenhuma API key configurada (GROQ_API_KEY ou OPENAI_API_KEY)')
    }

    console.log(`🎯 Provider primário: ${this.primaryProvider}`)
  }

  /**
   * Formata texto de PDF para leitura digital (web e mobile) usando IA
   * Tenta Groq primeiro (GRATUITO), depois OpenAI como fallback
   * @param rawText - Texto bruto extraído do PDF
   * @returns Texto formatado em markdown + metadata
   */
  async formatTextForMobile(rawText: string): Promise<FormatTextResult> {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Texto vazio fornecido')
    }

    const prompt = this.buildPrompt(rawText)

    // Tentar com o provider primário primeiro
    if (this.primaryProvider === 'groq' && this.groqClient) {
      try {
        console.log('🤖 Tentando formatação com Groq (GRATUITO)...')
        return await this.formatWithGroq(prompt)
      } catch (error) {
        console.warn('⚠️ Erro com Groq, tentando fallback para OpenAI:', error)

        // Fallback para OpenAI se disponível
        if (this.openaiClient) {
          try {
            return await this.formatWithOpenAI(prompt)
          } catch (fallbackError) {
            console.error('❌ Erro também com OpenAI:', fallbackError)
            throw new Error('Falha ao reformatar texto com ambas as APIs')
          }
        }
        throw error
      }
    } else if (this.primaryProvider === 'openai' && this.openaiClient) {
      try {
        console.log('🤖 Usando OpenAI...')
        return await this.formatWithOpenAI(prompt)
      } catch (error) {
        console.error('❌ Erro com OpenAI:', error)
        throw new Error('Falha ao reformatar texto com IA')
      }
    }

    throw new Error('Nenhum provider de IA disponível')
  }

  /**
   * Verifica se todos os marcadores de página foram preservados
   */
  private validatePageMarkers(originalText: string, formattedText: string): void {
    // Extrair todos os marcadores do texto original
    const originalMarkers = originalText.match(/\[PAGE_\d+\]/g) || []
    const formattedMarkers = formattedText.match(/\[PAGE_\d+\]/g) || []

    console.log(`🔍 Verificando marcadores de página:`)
    console.log(`   Original: ${originalMarkers.length} marcadores`)
    console.log(`   Formatado: ${formattedMarkers.length} marcadores`)

    if (originalMarkers.length !== formattedMarkers.length) {
      console.error(`❌ ERRO CRÍTICO: Marcadores de página perdidos!`)
      console.error(`   Esperado: ${originalMarkers.length}`)
      console.error(`   Encontrado: ${formattedMarkers.length}`)
      console.error(`   Original: ${originalMarkers.slice(0, 10).join(', ')}${originalMarkers.length > 10 ? '...' : ''}`)
      console.error(`   Formatado: ${formattedMarkers.slice(0, 10).join(', ')}${formattedMarkers.length > 10 ? '...' : ''}`)

      // Encontrar quais marcadores foram perdidos
      const originalSet = new Set(originalMarkers)
      const formattedSet = new Set(formattedMarkers)
      const missing = [...originalSet].filter(m => !formattedSet.has(m))

      if (missing.length > 0) {
        console.error(`   Marcadores perdidos: ${missing.join(', ')}`)
      }

      throw new Error(`IA removeu ${originalMarkers.length - formattedMarkers.length} marcadores de página! Isso é INACEITÁVEL.`)
    }

    console.log(`✅ Todos os ${originalMarkers.length} marcadores preservados corretamente`)
  }

  /**
   * Formata texto usando Groq (GRATUITO - 14,400 req/dia)
   * Modelos disponíveis: llama-3.3-70b-versatile, mixtral-8x7b-32768
   */
  private async formatWithGroq(prompt: string, originalText?: string): Promise<FormatTextResult> {
    if (!this.groqClient) {
      throw new Error('Groq client não configurado')
    }

    const response = await this.groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile', // Modelo Llama 3.3 70B (gratuito e potente)
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em reformatar textos de PDFs acadêmicos e profissionais para leitura digital (web e mobile). NUNCA remova marcadores [PAGE_X].',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 8000, // Groq tem limite menor, mas é suficiente
    })

    const rawFormattedText = response.choices[0].message.content || ''
    const formattedText = this.cleanFormattedText(rawFormattedText)
    const tokensUsed = response.usage?.total_tokens || 0

    // VALIDAÇÃO CRÍTICA: Verificar se todos os marcadores foram preservados
    if (originalText) {
      this.validatePageMarkers(originalText, formattedText)
    }

    console.log(`✅ Formatação com Groq completa (${tokensUsed} tokens) - GRATUITO`)

    return {
      formattedText,
      tokensUsed,
      model: 'llama-3.3-70b-versatile',
    }
  }

  /**
   * Formata texto usando OpenAI
   */
  private async formatWithOpenAI(prompt: string): Promise<FormatTextResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client não configurado')
    }

    const response = await this.openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente especializado em reformatar textos de PDFs acadêmicos e profissionais para leitura digital (web e mobile).',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 16000,
    })

    const rawFormattedText = response.choices[0].message.content || ''
    const formattedText = this.cleanFormattedText(rawFormattedText)
    const tokensUsed = response.usage?.total_tokens || 0

    console.log(`✅ Formatação com OpenAI completa (${tokensUsed} tokens)`)

    return {
      formattedText,
      tokensUsed,
      model: 'gpt-4o-mini',
    }
  }

  /**
   * Constrói o prompt de formatação
   */
  private buildPrompt(rawText: string): string {
    return `Você é um assistente especializado em reformatar textos de PDFs acadêmicos e profissionais para leitura digital (web e mobile).

TAREFA: Reformatar o texto abaixo para uma experiência de leitura otimizada, seguindo estas regras:

1. **🚨 CRÍTICO - PRESERVAÇÃO DE MARCADORES DE PÁGINA (PRIORIDADE MÁXIMA):**
   - **JAMAIS REMOVA, ALTERE OU PERCA OS MARCADORES [PAGE_X]**
   - **CADA marcador [PAGE_X] que aparece no texto original DEVE aparecer no texto formatado**
   - **Se o texto tem [PAGE_1], [PAGE_2], [PAGE_3]... TODOS devem estar presentes na saída**
   - **Mantenha os marcadores EXATAMENTE na mesma posição relativa ao conteúdo**
   - **NÃO mescle, pule ou remova nenhuma marcação de página**
   - **Esta é a regra MAIS IMPORTANTE - violá-la torna o resultado inútil**

2. **PRESERVAÇÃO OBRIGATÓRIA DE CONTEÚDO:**
   - Todo o conteúdo original: títulos, subtítulos, parágrafos, citações, referências
   - Todos os números de páginas mencionados no texto
   - Todos os parágrafos completos - não quebre parágrafos no meio
   - A estrutura hierárquica completa do documento
   - Numeração de listas, tópicos e seções
   - Citações, notas de rodapé e referências bibliográficas

2. **FORMATAÇÃO MARKDOWN PROFISSIONAL:**
   - Títulos principais: # (H1)
   - Seções: ## (H2)
   - Subseções: ### (H3)
   - Subseções menores: #### (H4)
   - **Negrito** para termos-chave, conceitos importantes e definições
   - *Itálico* para ênfase, termos estrangeiros e citações curtas
   - Listas numeradas para sequências e procedimentos
   - Listas com bullets para enumerações
   - > Blocos de citação para trechos destacados
   - Tabelas em markdown quando aplicável
   - --- para separadores horizontais quando necessário

3. **MELHORIAS DE LEGIBILIDADE:**
   - Espaçamento adequado entre seções e parágrafos
   - Quebras de linha estratégicas para facilitar escaneamento visual
   - Destaque visual para conceitos-chave usando **negrito**
   - Estrutura clara e hierárquica
   - Formatação consistente ao longo de todo o documento

4. **REGRAS CRÍTICAS:**
   - ✅ MANTER: Todo o conteúdo, estrutura, marcadores [PAGE_X], números de página
   - ❌ NÃO: Adicionar conteúdo extra, resumir, omitir informações, alterar significado
   - ❌ NÃO: Remover ou modificar marcadores [PAGE_X] - JAMAIS!
   - ❌ NÃO: Alterar títulos, números de página ou estrutura hierárquica
   - ✅ APENAS: Reformatar o layout com markdown mantendo 100% do conteúdo original

5. **🔍 VERIFICAÇÃO FINAL OBRIGATÓRIA ANTES DE RETORNAR:**
   - ✓ Conte TODOS os marcadores [PAGE_X] no texto original
   - ✓ Conte TODOS os marcadores [PAGE_X] no texto formatado
   - ✓ Os números DEVEM ser EXATAMENTE iguais
   - ✓ Se o original tem [PAGE_1], [PAGE_2], [PAGE_3], [PAGE_4], [PAGE_5]...
   - ✓ O formatado DEVE ter [PAGE_1], [PAGE_2], [PAGE_3], [PAGE_4], [PAGE_5]...
   - ✓ SEM EXCEÇÕES - todos os marcadores devem estar presentes
   - ✓ Se faltar algum marcador, REFAÇA o trabalho até todos estarem presentes

Texto original:
---
${rawText}
---

Retorne APENAS o texto reformatado em markdown, preservando rigorosamente toda a estrutura e conteúdo original.`
  }

  /**
   * Processa PDF em chunks para textos muito grandes
   * @param rawText - Texto completo do PDF
   * @param chunkSize - Tamanho de cada chunk em caracteres
   */
  async formatTextInChunks(
    rawText: string,
    chunkSize: number = 8000
  ): Promise<FormatTextResult> {
    const chunks = this.splitIntoChunks(rawText, chunkSize)
    const results: FormatTextResult[] = []

    for (const chunk of chunks) {
      const result = await this.formatTextForMobile(chunk)
      results.push(result)
    }

    // Combinar resultados
    const formattedText = results.map((r) => r.formattedText).join('\n\n')
    const tokensUsed = results.reduce((sum, r) => sum + r.tokensUsed, 0)

    return {
      formattedText,
      tokensUsed,
      model: 'gpt-4o-mini',
    }
  }

  /**
   * Divide texto em chunks inteligentes (por parágrafo)
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const paragraphs = text.split('\n\n')
    const chunks: string[] = []
    let currentChunk = ''

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length < chunkSize) {
        currentChunk += paragraph + '\n\n'
      } else {
        if (currentChunk) chunks.push(currentChunk.trim())
        currentChunk = paragraph + '\n\n'
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim())

    return chunks
  }

  /**
   * Limpa texto formatado, removendo code blocks malformados
   */
  private cleanFormattedText(text: string): string {
    let cleaned = text

    // Remove opening fences (```markdown or ```) that appear at end of lines with content
    cleaned = cleaned.replace(/([^\n])```(markdown|javascript|typescript|python|java|css|html|json|bash|sql|xml)?\n/g, '$1\n')

    // Remove closing fences that appear at start of lines followed by content
    cleaned = cleaned.replace(/\n```([^\n])/g, '\n$1')

    // Remove isolated ``` that appear on lines with other content
    cleaned = cleaned.replace(/^(.+)```$/gm, '$1')
    cleaned = cleaned.replace(/^```(.+)$/gm, '$1')

    // Remove completely empty code blocks
    cleaned = cleaned.replace(/```[\w]*\s*```/g, '')

    // Remove isolated ``` on their own lines (likely remnants of malformed blocks)
    cleaned = cleaned.replace(/^\s*```\s*$/gm, '')

    // Clean up multiple consecutive empty lines (max 2 newlines)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')

    return cleaned
  }
}
