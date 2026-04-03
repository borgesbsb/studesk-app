/**
 * PASSO 2 — Extração do conteúdo programático por disciplina
 *
 * Recebe o PDF + mapeamento de páginas (gerado pelo Passo 1).
 * Para cada disciplina, extrai o texto das suas páginas específicas
 * e pede ao Claude para retornar o conteúdo programático exato.
 *
 * Isso evita enviar o PDF inteiro novamente e garante extração precisa
 * mesmo quando várias disciplinas estão na mesma página.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { extractPageRange } from '@/lib/pdf-extract-server'
import { callIAStructured } from '@/lib/ai-client'

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

    if (!file)     return NextResponse.json({ error: 'Arquivo não enviado' },    { status: 400 })
    if (!cargo?.trim()) return NextResponse.json({ error: 'Cargo não informado' }, { status: 400 })
    if (!discJson) return NextResponse.json({ error: 'Mapeamento de disciplinas não informado' }, { status: 400 })

    const disciplinasMap: DisciplinaMap[] = JSON.parse(discJson)
    if (!disciplinasMap.length) return NextResponse.json({ error: 'Nenhuma disciplina no mapeamento' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    // Determina o intervalo total de páginas para este cargo
    const paginaMin = Math.min(...disciplinasMap.map(d => d.pagina_inicio))
    const paginaMax = Math.max(...disciplinasMap.map(d => d.pagina_fim))

    console.log(`[extrair-disciplinas] cargo: "${cargo}" | páginas ${paginaMin}-${paginaMax} | ${disciplinasMap.length} disciplinas`)

    // Extrai o texto das páginas do cargo de uma só vez
    const textoSecao = await extractPageRange(buffer, paginaMin, paginaMax)
    console.log('[extrair-disciplinas] chars extraídos:', textoSecao.length)

    // Monta a lista de disciplinas com hint de páginas para o prompt
    const listaDisc = disciplinasMap
      .map(d => `- ${d.nome} (pág. ${d.pagina_inicio === d.pagina_fim ? d.pagina_inicio : `${d.pagina_inicio}-${d.pagina_fim}`})`)
      .join('\n')

    const prompt = `Você está analisando o conteúdo programático do cargo "${cargo}" de um edital de concurso público brasileiro.

O trecho abaixo contém as páginas ${paginaMin} a ${paginaMax} do edital.

Extraia o conteúdo programático COMPLETO e EXATO de cada disciplina listada abaixo:
${listaDisc}

REGRAS:
- Copie o conteúdo integral de cada disciplina, sem resumir ou alterar.
- Não inclua o nome da disciplina no campo conteudo.
- Se uma disciplina não for encontrada no trecho, retorne conteudo vazio.

TRECHO DO EDITAL (páginas ${paginaMin}-${paginaMax}):
${textoSecao}`

    const resultado = await callIAStructured<{ disciplinas: DisciplinaExtraida[] }>(
      prompt,
      'salvar_conteudos',
      SCHEMA_CONTEUDOS,
      { temperature: 0 }
    )

    const disciplinas = Array.isArray(resultado.disciplinas) ? resultado.disciplinas : []
    console.log('[extrair-disciplinas] extraídas:', disciplinas.length, '| com conteúdo:', disciplinas.filter(d => d.conteudo).length)

    return NextResponse.json({ success: true, data: { disciplinas } })

  } catch (error: any) {
    console.error('[extrair-disciplinas] Erro:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao processar PDF' }, { status: 500 })
  }
}
