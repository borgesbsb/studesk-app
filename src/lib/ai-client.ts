/**
 * Helper unificado de IA para rotas de editais.
 * Ordem de tentativa: Anthropic (Claude) → Groq → OpenAI
 */
import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

export interface AICallOptions {
  maxTokens?: number
  temperature?: number
}

/**
 * Chama a IA com o prompt fornecido.
 * Tenta Anthropic primeiro, depois Groq, depois OpenAI.
 */
export async function callIA(
  prompt: string,
  options: AICallOptions = {}
): Promise<string> {
  const { maxTokens = 4096, temperature = 0 } = options

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (!anthropicKey && !groqKey && !openaiKey) {
    throw new Error('Nenhuma chave de IA configurada (ANTHROPIC_API_KEY, GROQ_API_KEY ou OPENAI_API_KEY)')
  }

  // 1. Anthropic (Claude Haiku — rápido e eficiente)
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

  // 2. Groq (fallback — limita contexto para não ultrapassar TPM)
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

  // 3. OpenAI (último fallback)
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
