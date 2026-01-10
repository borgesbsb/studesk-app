import OpenAI from 'openai'

export interface HeaderFooterPattern {
  type: 'header' | 'footer'
  description: string
  exampleText: string
  regexPattern: string
}

export interface DetectionResult {
  patterns: HeaderFooterPattern[]
  tokensUsed: number
  confidence: string
}

export class HeaderFooterDetectorService {
  private openai: OpenAI

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não configurada')
    }

    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Detecta padrões de cabeçalho e rodapé analisando as primeiras páginas do PDF
   * @param pagesText - Array com texto das primeiras 2-3 páginas
   * @returns Padrões detectados pela IA
   */
  async detectPatterns(pagesText: string[]): Promise<DetectionResult> {
    if (!pagesText || pagesText.length === 0) {
      throw new Error('Nenhum texto fornecido para análise')
    }

    const prompt = this.buildDetectionPrompt(pagesText)

    try {
      console.log('🤖 Chamando OpenAI para detectar padrões de cabeçalho/rodapé...')

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Você é um especialista em análise de documentos PDF. Sua tarefa é identificar padrões de cabeçalhos e rodapés repetitivos que devem ser removidos para melhorar a leitura.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Muito baixa para ser consistente
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0].message.content || '{}'
      const result = JSON.parse(content)
      const tokensUsed = response.usage?.total_tokens || 0

      console.log(`✅ IA detectou ${result.patterns?.length || 0} padrões (${tokensUsed} tokens)`)

      return {
        patterns: result.patterns || [],
        tokensUsed,
        confidence: result.confidence || 'medium',
      }
    } catch (error) {
      console.error('Erro ao detectar padrões com OpenAI:', error)
      throw new Error('Falha ao detectar padrões de cabeçalho/rodapé')
    }
  }

  /**
   * Constrói o prompt para detecção de padrões
   */
  private buildDetectionPrompt(pagesText: string[]): string {
    const pagesFormatted = pagesText
      .map((text, idx) => `=== PÁGINA ${idx + 1} ===\n${text}`)
      .join('\n\n')

    return `Analise as páginas abaixo de um PDF e identifique padrões de CABEÇALHOS e RODAPÉS que aparecem repetidamente e devem ser removidos.

PÁGINAS DO PDF:
${pagesFormatted}

INSTRUÇÕES:
1. Identifique linhas que se repetem em TODAS ou MAIORIA das páginas
2. Cabeçalhos geralmente aparecem no TOPO (primeiras linhas)
3. Rodapés geralmente aparecem no FINAL (últimas linhas)
4. Padrões comuns incluem:
   - Nome de autor/equipe
   - Nome do curso/instituição
   - URLs de websites
   - Números de página
   - Datas
   - CPF/documentos pessoais
   - Informações de copyright

5. Para cada padrão detectado, forneça:
   - type: "header" ou "footer"
   - description: breve descrição do que é (ex: "Nome do autor")
   - exampleText: exemplo exato do texto que aparece
   - regexPattern: padrão regex JavaScript para identificar (use /i para case-insensitive)

IMPORTANTE:
- NÃO inclua conteúdo real do documento (títulos de seções, parágrafos, etc)
- APENAS metadados repetitivos que poluem a leitura
- Seja CONSERVADOR: em caso de dúvida, NÃO marque como cabeçalho/rodapé

FORMATO DE RESPOSTA (JSON):
{
  "patterns": [
    {
      "type": "header",
      "description": "Nome do autor e número da aula",
      "exampleText": "Equipe Direito Administrativo, Herbert Almeida, Paulo H M Sousa, Aula 00",
      "regexPattern": "Equipe Direito Administrativo.*Herbert Almeida.*Paulo H M Sousa.*Aula\\\\s+\\\\d+"
    },
    {
      "type": "footer",
      "description": "URL do site",
      "exampleText": "www.estrategiaconcursos.com.br",
      "regexPattern": "www\\\\.estrategiaconcursos\\\\.com\\\\.br"
    }
  ],
  "confidence": "high"
}

Retorne APENAS o JSON, sem explicações adicionais.`
  }

  /**
   * Aplica os padrões detectados para limpar o texto
   */
  applyPatterns(text: string, patterns: HeaderFooterPattern[]): string {
    if (!patterns || patterns.length === 0) {
      console.log('⚠️  Nenhum padrão para aplicar')
      return text
    }

    let lines = text.split('\n')
    const originalLineCount = lines.length
    let removedCount = 0

    console.log(`🧹 Aplicando ${patterns.length} padrões de limpeza...`)

    // Criar versões mais flexíveis dos padrões (remover partes opcionais)
    const flexiblePatterns = patterns.map((p) => {
      let flexibleRegex = p.regexPattern

      // Tornar "Aula \d+" opcional
      flexibleRegex = flexibleRegex.replace(/\.?\*Aula\\s\+\\d\+/, '')

      // Remover espaços extras e quebras de linha que podem estar no regex
      flexibleRegex = flexibleRegex.replace(/\\s\+/g, '\\s*')

      return {
        ...p,
        originalRegex: p.regexPattern,
        flexibleRegex: flexibleRegex,
      }
    })

    // Filtrar linhas usando os padrões
    const filteredLines = lines.filter((line) => {
      const trimmedLine = line.trim()

      // Manter linhas vazias
      if (trimmedLine === '') return true

      // Normalizar linha (remover espaços extras)
      const normalizedLine = trimmedLine.replace(/\s+/g, ' ')

      // Verificar cada padrão (tentar original primeiro, depois flexível)
      for (const pattern of flexiblePatterns) {
        try {
          // Tentar regex original
          const originalRegex = new RegExp(pattern.originalRegex, 'i')
          if (originalRegex.test(normalizedLine)) {
            console.log(
              `🗑️  Removendo (${pattern.description}): "${trimmedLine.substring(0, 60)}${trimmedLine.length > 60 ? '...' : ''}"`
            )
            removedCount++
            return false
          }

          // Tentar regex flexível
          if (pattern.flexibleRegex !== pattern.originalRegex) {
            const flexibleRegexObj = new RegExp(pattern.flexibleRegex, 'i')
            if (flexibleRegexObj.test(normalizedLine)) {
              console.log(
                `🗑️  Removendo (${pattern.description} - flexível): "${trimmedLine.substring(0, 60)}${trimmedLine.length > 60 ? '...' : ''}"`
              )
              removedCount++
              return false
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao aplicar regex "${pattern.regexPattern}":`, error)
        }
      }

      return true
    })

    console.log(
      `📊 Limpeza: ${originalLineCount} linhas → ${filteredLines.length} linhas (removidas: ${removedCount})`
    )

    // Remover múltiplas linhas vazias consecutivas
    let cleanedText = filteredLines.join('\n')
    cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n')

    return cleanedText.trim()
  }
}
