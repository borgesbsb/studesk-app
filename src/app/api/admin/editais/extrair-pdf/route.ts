import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { callIA } from '@/lib/ai-client'

const PROMPT_METADATA = (texto: string) => `Você é especialista em editais de concursos públicos brasileiros.

A partir do texto abaixo (início do edital), extraia as informações de identificação do concurso.
Retorne SOMENTE um JSON válido, sem markdown, sem texto adicional:

{
  "nome": "nome completo do concurso/edital",
  "orgao": "nome da banca organizadora (CESPE, FCC, VUNESP, etc.) ou órgão público realizador",
  "cargo": "nome do cargo principal ou primeiro cargo listado",
  "ano": 2025
}

REGRAS:
1. Retorne APENAS o JSON, sem nenhum texto antes ou depois.
2. Se não encontrar um campo, use null.
3. "ano" deve ser número inteiro ou null.

TEXTO:
${texto}`

const PROMPT_CARGOS = (texto: string) => `Você é especialista em editais de concursos públicos brasileiros.

A partir do texto abaixo, extraia TODOS os cargos oferecidos neste concurso.
Retorne SOMENTE um JSON válido, sem markdown, sem texto adicional:

{
  "cargos": ["Cargo A", "Cargo B", "Cargo C"]
}

REGRAS:
1. Retorne APENAS o JSON, sem nenhum texto antes ou depois.
2. Liste TODOS os cargos/funções mencionados no edital, sem duplicatas.
3. Se não encontrar cargos, retorne {"cargos": []}.
4. Inclua o nível/área quando fizer parte do nome do cargo (ex: "Analista Judiciário - Área Administrativa").

TEXTO:
${texto}`

function parseJSON(raw: string): any {
  const limpo = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/m, '')
    .trim()
  return JSON.parse(limpo)
}

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

    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)

    console.log('[extrair-pdf] páginas:', data.numpages, 'chars totais:', data.text?.length)

    if (!data.text || data.text.trim().length < 10) {
      return NextResponse.json({
        error: 'Este PDF é baseado em imagem (escaneado) e não possui camada de texto. A extração automática não é possível — por favor, crie o edital manualmente.',
        imageBased: true,
      }, { status: 400 })
    }

    // Capa (3k chars) → metadados | Início do edital (10k chars) → todos os cargos
    const textoCapa = data.text.slice(0, 3000)
    const textoCompleto = data.text.slice(0, 10000)

    console.log('[extrair-pdf] chamando IA em paralelo — capa:', textoCapa.length, 'chars | cargos:', textoCompleto.length, 'chars')

    const [respostaMetadata, respostaCargos] = await Promise.all([
      callIA(PROMPT_METADATA(textoCapa), { maxTokens: 512, temperature: 0.1 }),
      callIA(PROMPT_CARGOS(textoCompleto), { maxTokens: 1024, temperature: 0.1 }),
    ])

    const metadata = parseJSON(respostaMetadata)
    const { cargos } = parseJSON(respostaCargos)

    console.log('[extrair-pdf] ok — cargos encontrados:', cargos?.length ?? 0)

    return NextResponse.json({
      success: true,
      data: {
        nome: metadata.nome ?? null,
        orgao: metadata.orgao ?? null,
        cargo: metadata.cargo ?? null,
        ano: metadata.ano ?? null,
        cargos: Array.isArray(cargos) ? cargos : [],
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
