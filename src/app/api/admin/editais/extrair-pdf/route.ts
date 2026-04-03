/**
 * PASSO 1 — Mapeamento estrutural do edital
 *
 * Envia o PDF completo para a API da Anthropic e obtém:
 * - Metadados do concurso (nome, órgão, ano)
 * - Todos os cargos
 * - Para cada cargo: todas as disciplinas com pagina_inicio e pagina_fim
 *
 * Esse mapeamento é usado pelo Passo 2 (extrair-disciplinas) para extrair
 * o conteúdo programático exato de cada disciplina usando apenas suas páginas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface DisciplinaMap {
  nome: string
  pagina_inicio: number
  pagina_fim: number
}

interface CargoMap {
  nome: string
  disciplinas: DisciplinaMap[]
}

interface EditalMap {
  nome: string
  orgao: string
  ano: number | null
  cargos: CargoMap[]
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const formData = await req.formData()
    const file = (formData as any).get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey: anthropicKey })

    console.log('[extrair-pdf] enviando PDF completo para Anthropic (', (buffer.length / 1024).toFixed(0), 'KB)...')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      tools: [
        {
          name: 'mapear_edital',
          description: 'Mapeia a estrutura do edital com todos os cargos, disciplinas e localização de cada uma no PDF',
          input_schema: {
            type: 'object' as const,
            properties: {
              nome:  { type: 'string', description: 'Nome completo do concurso/edital' },
              orgao: { type: 'string', description: 'Nome da banca organizadora ou órgão público realizador' },
              ano:   { type: ['integer', 'null'] as any, description: 'Ano do concurso como número inteiro' },
              cargos: {
                type: 'array',
                description: 'Todos os cargos oferecidos no concurso',
                items: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string', description: 'Nome exato do cargo' },
                    disciplinas: {
                      type: 'array',
                      description: 'Todas as disciplinas do conteúdo programático deste cargo',
                      items: {
                        type: 'object',
                        properties: {
                          nome:          { type: 'string',  description: 'Nome exato da disciplina como aparece no edital' },
                          pagina_inicio: { type: 'integer', description: 'Número da página onde começa o conteúdo programático desta disciplina' },
                          pagina_fim:    { type: 'integer', description: 'Número da página onde termina o conteúdo programático desta disciplina' },
                        },
                        required: ['nome', 'pagina_inicio', 'pagina_fim'],
                      },
                    },
                  },
                  required: ['nome', 'disciplinas'],
                },
              },
            },
            required: ['nome', 'orgao', 'ano', 'cargos'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'mapear_edital' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: buffer.toString('base64'),
              },
            },
            {
              type: 'text',
              text: 'Analise a seção de conteúdo programático deste edital (geralmente em um Anexo). Para cada cargo, liste todas as disciplinas informando em quais páginas do PDF o conteúdo programático de cada disciplina está localizado.',
            },
          ],
        },
      ],
    })

    const toolUse = message.content.find(b => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json({ error: 'Anthropic não retornou dados estruturados' }, { status: 500 })
    }

    const data = toolUse.input as EditalMap

    console.log(
      '[extrair-pdf] ok — cargos:', data.cargos?.length,
      '| tokens:', message.usage.input_tokens, '+', message.usage.output_tokens
    )

    return NextResponse.json({ success: true, data })

  } catch (error: any) {
    console.error('[extrair-pdf] Erro:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar PDF' },
      { status: 500 }
    )
  }
}
