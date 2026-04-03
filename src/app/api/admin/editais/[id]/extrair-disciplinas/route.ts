import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import { extractPdfText, localizarSecaoPorAncora } from '@/lib/pdf-extract-server'
import { callIAStructured } from '@/lib/ai-client'

// ---------------------------------------------------------------------------
// Schema do tool_use
// ---------------------------------------------------------------------------

interface DisciplinaExtraida {
  nome: string
  conteudo: string
}

interface DisciplinasExtraidas {
  disciplinas: DisciplinaExtraida[]
}

const SCHEMA_DISCIPLINAS = {
  properties: {
    disciplinas: {
      type: 'array',
      description: 'Todas as disciplinas/matérias do conteúdo programático para o cargo informado',
      items: {
        type: 'object',
        properties: {
          nome: {
            type: 'string',
            description: 'Nome exato da disciplina como aparece no edital',
          },
          conteudo: {
            type: 'string',
            description: 'Conteúdo programático completo da disciplina, exatamente como aparece no edital',
          },
        },
        required: ['nome', 'conteudo'],
      },
    },
  },
  required: ['disciplinas'],
}

const PROMPT = (cargo: string, texto: string) => `Você é especialista em editais de concursos públicos brasileiros.

Analise o trecho do edital abaixo e extraia TODAS as disciplinas do conteúdo programático para o cargo "${cargo}".

REGRAS:
- Inclua TODAS as disciplinas/matérias listadas para este cargo.
- O campo "conteudo" deve ter o texto integral do conteúdo programático daquela disciplina.
- Se o cargo não for encontrado, retorne disciplinas vazia.
- Preserve o texto original do conteúdo, sem resumir ou alterar.

TRECHO DO EDITAL:
${texto}`

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

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
    const file = (formData as any).get('file') as File | null
    const cargo = ((formData as any).get('cargo') as string | null) || edital.cargo || ''
    const ancora = (formData as any).get('ancora') as string | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
    if (!cargo.trim()) return NextResponse.json({ error: 'Cargo não informado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const textoCompleto = await extractPdfText(buffer)

    console.log('[extrair-disciplinas/id] páginas processadas, chars totais:', textoCompleto?.length)

    if (!textoCompleto || textoCompleto.trim().length < 10) {
      return NextResponse.json({
        error: 'Este PDF é baseado em imagem (escaneado) e não possui camada de texto. A extração automática não é possível.',
        imageBased: true,
      }, { status: 400 })
    }

    const { secao, metodo } = localizarSecaoPorAncora(textoCompleto, ancora)
    console.log('[extrair-disciplinas/id] cargo:', cargo, '| metodo:', metodo, '| chars da seção:', secao.length)

    const resultado = await callIAStructured<DisciplinasExtraidas>(
      PROMPT(cargo.trim(), secao),
      'salvar_disciplinas',
      SCHEMA_DISCIPLINAS,
      { temperature: 0 }
    )

    const disciplinas = Array.isArray(resultado.disciplinas) ? resultado.disciplinas : []
    console.log('[extrair-disciplinas/id] disciplinas encontradas:', disciplinas.length)

    return NextResponse.json({
      success: true,
      data: { disciplinas },
    })
  } catch (error: any) {
    console.error('[extrair-disciplinas/id] Erro:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar PDF' },
      { status: 500 }
    )
  }
}
