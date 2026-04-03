/**
 * Helper unificado de IA para rotas de editais.
 *
 * callIA           — resposta em texto livre (fallback Anthropic → Groq → OpenAI)
 * callIAStructured — resposta estruturada via Anthropic tool_use (JSON garantido pelo schema)
 *                    fallback para callIA + JSON.parse se não houver ANTHROPIC_API_KEY
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface AICallOptions {
  maxTokens?: number
  temperature?: number
}

// ---------------------------------------------------------------------------
// callIA — texto livre
// ---------------------------------------------------------------------------

/**
 * Chama a IA com o prompt fornecido.
 * Ordem de tentativa: Anthropic Claude → Groq → OpenAI
 */
export async function callIA(
  prompt: string,
  options: AICallOptions = {}
): Promise<string> {
  const { maxTokens = 8096, temperature = 0 } = options

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey && !groqKey && !openaiKey) {
    throw new Error('Nenhuma chave de IA configurada (ANTHROPIC_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY)')
  }

  // 1. Anthropic (Claude Haiku — rápido e janela de 200k tokens)
  if (anthropicKey) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      })
      const content = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
      if (content) return content
    } catch (err: any) {
      console.warn('[ai-client] Anthropic falhou:', err?.message)
    }
  }

  // 2. Groq
  if (groqKey) {
    try {
      const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) return content
    } catch (err: any) {
      console.warn('[ai-client] Groq falhou:', err?.message)
    }
  }

  // 3. OpenAI
  if (openaiKey) {
    const openai = new OpenAI({ apiKey: openaiKey })
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens,
    })
    const content = res.choices[0]?.message?.content?.trim()
    if (content) return content
    throw new Error('OpenAI retornou resposta vazia')
  }

  throw new Error('Nenhum provedor de IA disponível')
}

// ---------------------------------------------------------------------------
// callIAStructured — JSON garantido via Anthropic tool_use
// ---------------------------------------------------------------------------

export interface ToolSchema {
  properties: Record<string, any>
  required?: string[]
}

/**
 * Extração estruturada usando Anthropic tool_use.
 * O Claude É FORÇADO a retornar JSON válido respeitando o schema fornecido —
 * elimina falhas de parse e respostas com texto extra.
 *
 * Se ANTHROPIC_API_KEY não estiver configurada, cai para callIA + JSON.parse.
 */
export async function callIAStructured<T>(
  prompt: string,
  toolName: string,
  schema: ToolSchema,
  options: AICallOptions = {}
): Promise<T> {
  const { temperature = 0 } = options
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  // Caminho principal: Anthropic tool_use
  if (anthropicKey) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey })
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8096,
        temperature,
        tools: [
          {
            name: toolName,
            description: 'Salva os dados estruturados extraídos do edital',
            input_schema: {
              type: 'object',
              properties: schema.properties,
              required: schema.required ?? Object.keys(schema.properties),
            },
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
        messages: [{ role: 'user', content: prompt }],
      })

      const toolUse = message.content.find(b => b.type === 'tool_use')
      if (toolUse?.type === 'tool_use') {
        return toolUse.input as T
      }
    } catch (err: any) {
      console.warn('[ai-client] tool_use falhou, tentando fallback JSON:', err?.message)
    }
  }

  // Fallback: texto livre + parse manual
  const promptJson = `${prompt}\n\nRetorne APENAS JSON válido, sem markdown, sem texto adicional.`
  const raw = await callIA(promptJson, options)
  const limpo = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/m, '')
    .trim()
  return JSON.parse(limpo) as T
}
