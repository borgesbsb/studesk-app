/**
 * Extração de disciplinas para um edital já existente.
 * Faz os 2 passos internamente:
 *   1. PDF completo → Anthropic → mapeamento de disciplinas + páginas para o cargo
 *   2. Páginas específicas → Claude → conteúdo programático de cada disciplina
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import { extractPageRange } from '@/lib/pdf-extract-server'
import { callIAStructured } from '@/lib/ai-client'
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

const SCHEMA_MAPEAMENTO = {
  properties: {
    disciplinas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome:          { type: 'string' },
          pagina_inicio: { type: 'integer' },
          pagina_fim:    { type: 'integer' },
        },
        required: ['nome', 'pagina_inicio', 'pagina_fim'],
      },
    },
  },
  required: ['disciplinas'],
}

const SCHEMA_CONTEUDOS = {
  properties: {
    disciplinas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nome:     { type: 'string' },
          conteudo: { type: 'string' },
        },
        required: ['nome', 'conteudo'],
      },
    },
  },
  required: ['disciplinas'],
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: editalId } = await params
    const edital = await prisma.edital.findUnique({ where: { id: editalId } })
    if (!edital) return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 })

    const formData = await req.formData()
    const file  = (formData as any).get('file')  as File   | null
    const cargo = ((formData as any).get('cargo') as string | null) || edital.cargo || ''

    if (!file)         return NextResponse.json({ error: 'Arquivo não enviado' },    { status: 400 })
    if (!cargo.trim()) return NextResponse.json({ error: 'Cargo não informado' },    { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })

    // -----------------------------------------------------------------------
    // Passo 1 — mapeamento de páginas para o cargo
    // -----------------------------------------------------------------------
    console.log(`[extrair-disciplinas/${editalId}] Passo 1: mapeando páginas para cargo "${cargo}"`)

    const client = new Anthropic({ apiKey: anthropicKey })

    const msg1 = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      tools: [{
        name: 'mapear_cargo',
        description: 'Mapeia as disciplinas e páginas do cargo especificado',
        input_schema: {
          type: 'object' as const,
          properties: SCHEMA_MAPEAMENTO.properties,
          required: SCHEMA_MAPEAMENTO.required,
        },
      }],
      tool_choice: { type: 'tool', name: 'mapear_cargo' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
          },
          {
            type: 'text',
            text: `Localize no conteúdo programático deste edital todas as disciplinas do cargo "${cargo}". Para cada disciplina, informe em quais páginas do PDF seu conteúdo programático está localizado.`,
          },
        ],
      }],
    })

    const mapa = (msg1.content.find(b => b.type === 'tool_use') as any)?.input as { disciplinas: DisciplinaMap[] }
    if (!mapa?.disciplinas?.length) {
      return NextResponse.json({ error: `Nenhuma disciplina encontrada para o cargo "${cargo}"` }, { status: 400 })
    }

    const disciplinasMap = mapa.disciplinas
    console.log(`[extrair-disciplinas/${editalId}] Passo 1 ok — ${disciplinasMap.length} disciplinas mapeadas`)

    // -----------------------------------------------------------------------
    // Passo 2 — extração de conteúdo pelas páginas mapeadas
    // -----------------------------------------------------------------------
    const paginaMin = Math.min(...disciplinasMap.map(d => d.pagina_inicio))
    const paginaMax = Math.max(...disciplinasMap.map(d => d.pagina_fim))

    const textoSecao = await extractPageRange(buffer, paginaMin, paginaMax)
    console.log(`[extrair-disciplinas/${editalId}] Passo 2: páginas ${paginaMin}-${paginaMax}, ${textoSecao.length} chars`)

    const listaDisc = disciplinasMap
      .map(d => `- ${d.nome} (pág. ${d.pagina_inicio === d.pagina_fim ? d.pagina_inicio : `${d.pagina_inicio}-${d.pagina_fim}`})`)
      .join('\n')

    const prompt = `Você está analisando o conteúdo programático do cargo "${cargo}" de um edital de concurso público brasileiro.

Extraia o conteúdo programático COMPLETO e EXATO de cada disciplina listada:
${listaDisc}

Não resuma nem altere o conteúdo. Se não encontrar uma disciplina, deixe conteudo vazio.

TRECHO DO EDITAL (páginas ${paginaMin}-${paginaMax}):
${textoSecao}`

    const resultado = await callIAStructured<{ disciplinas: DisciplinaExtraida[] }>(
      prompt, 'salvar_conteudos', SCHEMA_CONTEUDOS, { temperature: 0 }
    )

    const disciplinas = Array.isArray(resultado.disciplinas) ? resultado.disciplinas : []
    console.log(`[extrair-disciplinas/${editalId}] Passo 2 ok — ${disciplinas.length} disciplinas com conteúdo`)

    return NextResponse.json({ success: true, data: { disciplinas } })

  } catch (error: any) {
    console.error('[extrair-disciplinas/id] Erro:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar PDF' }, { status: 500 })
  }
}
