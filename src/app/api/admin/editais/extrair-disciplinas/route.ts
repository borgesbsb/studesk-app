/**
 * PASSO 2 — Extração do conteúdo programático por disciplina
 *
 * Recebe o PDF + mapeamento de páginas (gerado pelo Passo 1).
 * Envia o PDF completo para a Anthropic com as disciplinas e páginas mapeadas,
 * pedindo para extrair o conteúdo programático exato de cada disciplina.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import Anthropic from '@anthropic-ai/sdk'

interface DisciplinaMap {
  nome: string
  pagina_inicio: number
  pagina_fim: number
}

interface DisciplinaExtraida {
  nome: string
  conteudo: string
}

const SCHEMA_CONTEUDOS = {
  properties: {
    disciplinas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome:     { type: 'string', description: 'Nome exato da disciplina' },
          conteudo: { type: 'string', description: 'Conteúdo programático completo, exatamente como aparece no edital' },
        },
        required: ['nome', 'conteudo'],
      },
    },
  },
  required: ['disciplinas'],
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData   = await req.formData()
    const file       = (formData as any).get('file')       as File   | null
    const cargo      = (formData as any).get('cargo')      as string | null
    const discJson   = (formData as any).get('disciplinas') as string | null

    if (!file)          return NextResponse.json({ error: 'Arquivo não enviado' },                        { status: 400 })
    if (!cargo?.trim()) return NextResponse.json({ error: 'Cargo não informado' },                        { status: 400 })
    if (!discJson)      return NextResponse.json({ error: 'Mapeamento de disciplinas não informado' },    { status: 400 })

    const disciplinasMap: DisciplinaMap[] = JSON.parse(discJson)
    if (!disciplinasMap.length) return NextResponse.json({ error: 'Nenhuma disciplina no mapeamento' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })

    const paginaMin = Math.min(...disciplinasMap.map(d => d.pagina_inicio))
    const paginaMax = Math.max(...disciplinasMap.map(d => d.pagina_fim))

    const listaDisc = disciplinasMap
      .map(d => `- ${d.nome} (pág. ${d.pagina_inicio === d.pagina_fim ? d.pagina_inicio : `${d.pagina_inicio}-${d.pagina_fim}`})`)
      .join('\n')

    console.log(`[extrair-disciplinas] cargo: "${cargo}" | páginas ${paginaMin}-${paginaMax} | ${disciplinasMap.length} disciplinas`)

    const client = new Anthropic({ apiKey: anthropicKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8096,
      tools: [{
        name: 'salvar_conteudos',
        description: 'Salva o conteúdo programático extraído de cada disciplina',
        input_schema: {
          type: 'object' as const,
          properties: SCHEMA_CONTEUDOS.properties,
          required: SCHEMA_CONTEUDOS.required,
        },
      }],
      tool_choice: { type: 'tool', name: 'salvar_conteudos' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
          },
          {
            type: 'text',
            text: `Você está analisando o conteúdo programático do cargo "${cargo}" de um edital de concurso público brasileiro.

Extraia o conteúdo programático COMPLETO e EXATO de cada disciplina listada abaixo. O conteúdo de cada disciplina está localizado nas páginas indicadas:

${listaDisc}

REGRAS:
- Copie o conteúdo integral de cada disciplina, sem resumir ou alterar.
- Não inclua o nome da disciplina no campo conteudo.
- Se uma disciplina não for encontrada, retorne conteudo vazio.`,
          },
        ],
      }],
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'Anthropic não retornou dados estruturados' }, { status: 500 })
    }

    const resultado = toolUse.input as { disciplinas: DisciplinaExtraida[] }
    const disciplinas = Array.isArray(resultado.disciplinas) ? resultado.disciplinas : []

    console.log('[extrair-disciplinas] extraídas:', disciplinas.length, '| com conteúdo:', disciplinas.filter(d => d.conteudo).length)

    return NextResponse.json({ success: true, data: { disciplinas } })

  } catch (error: any) {
    console.error('[extrair-disciplinas] Erro:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar PDF' }, { status: 500 })
  }
}
