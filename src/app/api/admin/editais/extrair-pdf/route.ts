import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { extractPdfText } from '@/lib/pdf-extract-server'
import { callIAStructured } from '@/lib/ai-client'

// ---------------------------------------------------------------------------
// Schema do tool_use — retorna metadata + cargos com âncoras de seção
// ---------------------------------------------------------------------------

interface CargoExtraido {
  nome: string
  ancora: string
}

interface MetadataExtraida {
  nome: string | null
  orgao: string | null
  ano: number | null
  cargos: CargoExtraido[]
}

const SCHEMA_METADATA = {
  properties: {
    nome: {
      type: 'string',
      description: 'Nome completo do concurso/edital',
    },
    orgao: {
      type: 'string',
      description: 'Nome da banca organizadora (CESPE, FCC, VUNESP, etc.) ou órgão público',
    },
    ano: {
      type: ['integer', 'null'],
      description: 'Ano do concurso como número inteiro, ou null se não encontrado',
    },
    cargos: {
      type: 'array',
      description: 'Todos os cargos/funções oferecidos neste concurso',
      items: {
        type: 'object',
        properties: {
          nome: {
            type: 'string',
            description: 'Nome exato do cargo, incluindo área/especialidade quando aplicável',
          },
          ancora: {
            type: 'string',
            description:
              'Trecho de 60-150 chars que aparece EXATAMENTE no documento imediatamente antes ou no início da seção de conteúdo programático deste cargo. Use um trecho único e inequívoco (ex: "CARGO: ANALISTA JUDICIÁRIO\\nCONHECIMENTOS ESPECÍFICOS"). Se não houver seção separada por cargo, use o cabeçalho geral de conteúdo programático.',
          },
        },
        required: ['nome', 'ancora'],
      },
    },
  },
  required: ['nome', 'orgao', 'ano', 'cargos'],
}

const PROMPT = (texto: string) => `Você é especialista em editais de concursos públicos brasileiros.

Analise o texto do edital abaixo e extraia:
1. Metadados do concurso (nome, órgão/banca, ano)
2. TODOS os cargos/funções oferecidos, com a âncora de localização da seção de conteúdo programático de cada um

TEXTO DO EDITAL:
${texto}`

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

    // Extração de texto com awareness de posição
    console.log('[extrair-pdf] extraindo texto com pdfjs-dist...')
    const textoCompleto = await extractPdfText(buffer)

    console.log('[extrair-pdf] chars extraídos:', textoCompleto.length)

    if (!textoCompleto || textoCompleto.trim().length < 10) {
      return NextResponse.json({
        error: 'Este PDF é baseado em imagem (escaneado) e não possui camada de texto. A extração automática não é possível — por favor, crie o edital manualmente.',
        imageBased: true,
      }, { status: 400 })
    }

    // Envia até 80k chars — cobre ~95% dos editais sem estourar o contexto
    const textoIA = textoCompleto.slice(0, 80000)
    console.log('[extrair-pdf] enviando', textoIA.length, 'chars para IA (tool_use)')

    const resultado = await callIAStructured<MetadataExtraida>(
      PROMPT(textoIA),
      'salvar_metadata_edital',
      SCHEMA_METADATA,
      { temperature: 0 }
    )

    console.log('[extrair-pdf] cargos encontrados:', resultado.cargos?.length ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        nome: resultado.nome ?? null,
        orgao: resultado.orgao ?? null,
        ano: resultado.ano ?? null,
        cargos: Array.isArray(resultado.cargos) ? resultado.cargos : [],
      },
    })
  } catch (error: any) {
    console.error('[extrair-pdf] Erro:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao processar PDF' },
      { status: 500 }
    )
  }
}
