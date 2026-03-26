import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import OpenAI from 'openai'
import { pdfToMarkdown } from '@/lib/pdf-to-markdown'

// Palavras-chave que marcam o início da seção de conteúdo programático em editais brasileiros
const MARCADORES_SECAO = [
  'CONTEÚDO PROGRAMÁTICO',
  'CONTEUDO PROGRAMÁTICO',
  'CONTEÚDO PROGRAMATICO',
  'CONTEUDO PROGRAMATICO',
  'PROGRAMA DE PROVAS',
  'CONHECIMENTOS ESPECÍFICOS',
  'CONHECIMENTOS ESPECIFICOS',
  'CONHECIMENTOS GERAIS',
  'MATÉRIAS EXIGIDAS',
  'MATERIAS EXIGIDAS',
  'DISCIPLINAS EXIGIDAS',
  'PROGRAMA DAS PROVAS',
  'COMPONENTES CURRICULARES',
]

/**
 * Localiza no texto a seção de conteúdo programático usando palavras-chave.
 * Retorna o texto a partir desse ponto (até maxChars caracteres).
 * Se não encontrar, retorna o texto inteiro até maxChars.
 */
function localizarSecao(texto: string, maxChars = 25000): { secao: string; marcador: string | null } {
  const textoUpper = texto.toUpperCase()

  for (const marcador of MARCADORES_SECAO) {
    // Usa a ÚLTIMA ocorrência para pular o sumário/índice (que aparece antes do conteúdo real)
    const idx = textoUpper.lastIndexOf(marcador)
    if (idx !== -1) {
      console.log(`[extrair-disciplinas] Seção localizada em offset ${idx} (última ocorrência) pelo marcador: "${marcador}"`)
      return {
        secao: texto.slice(idx, idx + maxChars),
        marcador,
      }
    }
  }

  console.log('[extrair-disciplinas] Marcador não encontrado — usando início do documento')
  return { secao: texto.slice(0, maxChars), marcador: null }
}

const PROMPT = (cargo: string, texto: string) => `Você é especialista em editais de concursos públicos brasileiros.

Analise o trecho do edital abaixo (seção de conteúdo programático) e extraia TODAS as disciplinas para o cargo "${cargo}".
Retorne SOMENTE um JSON válido, sem markdown, sem texto adicional:

{
  "disciplinas": [
    {
      "nome": "nome exato da disciplina",
      "conteudo": "conteúdo programático completo da disciplina, exatamente como aparece no edital"
    }
  ]
}

REGRAS:
1. Retorne APENAS o JSON, sem nenhum texto antes ou depois.
2. Inclua TODAS as disciplinas/matérias listadas para o cargo informado.
3. O campo "conteudo" deve ter o texto integral do conteúdo programático daquela disciplina.
4. Se o cargo não for encontrado no trecho, retorne {"disciplinas": []}.

TRECHO DO EDITAL:
${texto}`

async function callIA(cargo: string, secao: string, groqKey?: string, openaiKey?: string): Promise<string> {
  // Groq: limita a 20k chars para não ultrapassar o TPM
  if (groqKey) {
    try {
      const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: PROMPT(cargo, secao.slice(0, 20000)) }],
        temperature: 0.1,
        max_tokens: 8000,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) return content
    } catch (err: any) {
      console.warn('[extrair-disciplinas] Groq falhou, tentando OpenAI:', err?.message)
    }
  }

  // OpenAI: usa a seção completa (128k context window suporta)
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: PROMPT(cargo, secao) }],
        temperature: 0.1,
        max_tokens: 8000,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) return content
      throw new Error('OpenAI retornou resposta vazia')
    } catch (err: any) {
      console.error('[extrair-disciplinas] OpenAI falhou:', err?.message)
      throw err
    }
  }

  throw new Error('Nenhum provedor de IA disponível')
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = (formData as any).get('file') as File | null
    const cargo = (formData as any).get('cargo') as string | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!cargo?.trim()) return NextResponse.json({ error: 'Cargo não informado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)

    if (!data.text || data.text.trim().length < 10) {
      return NextResponse.json({
        error: 'Este PDF é baseado em imagem (escaneado) e não possui camada de texto.',
        imageBased: true,
      }, { status: 400 })
    }

    const groqKey = process.env.GROQ_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY
    if (!groqKey && !openaiKey) {
      return NextResponse.json({ error: 'Nenhuma chave de IA configurada' }, { status: 500 })
    }

    // Converte para markdown e localiza a seção de conteúdo programático
    const markdown = pdfToMarkdown(data.text)
    const { secao, marcador } = localizarSecao(markdown)
    console.log('[extrair-disciplinas] cargo:', cargo, '| chars da seção (md):', secao.length, '| marcador:', marcador)
    console.log('[extrair-disciplinas] primeiros 500 chars da seção:\n', secao.slice(0, 500))

    const resposta = await callIA(cargo, secao, groqKey, openaiKey)

    const jsonLimpo = resposta
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/m, '')
      .trim()

    const { disciplinas } = JSON.parse(jsonLimpo)
    console.log('[extrair-disciplinas] encontradas:', disciplinas?.length ?? 0)

    return NextResponse.json({
      success: true,
      data: { disciplinas: Array.isArray(disciplinas) ? disciplinas : [] },
    })
  } catch (error: any) {
    console.error('[extrair-disciplinas] Erro:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar PDF' }, { status: 500 })
  }
}
