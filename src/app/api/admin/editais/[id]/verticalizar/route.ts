import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import { callIAStructured } from '@/lib/ai-client'

// ---------------------------------------------------------------------------
// Schema do tool_use — retorna array de strings (um assunto por item)
// ---------------------------------------------------------------------------

interface Verticalizado {
  assuntos: string[]
}

const SCHEMA_VERTICALIZADO = {
  properties: {
    assuntos: {
      type: 'array',
      description: 'Lista de assuntos do conteúdo programático, um por item, na ordem original do edital',
      items: {
        type: 'string',
        description: 'Um assunto/tópico independente, sem numeração ou marcadores',
      },
    },
  },
  required: ['assuntos'],
}

function buildPrompt(disciplina: string, conteudo: string): string {
  return `Você é especialista em concursos públicos brasileiros e em editoração de editais verticalizados.

Sua tarefa é transformar o conteúdo programático bruto da disciplina "${disciplina}" em uma lista verticalizada — cada assunto em um item separado, de forma que o candidato consiga estudar e marcar cada tópico individualmente.

PRÉ-PROCESSAMENTO (faça antes de verticalizar):
1. Ignore linhas que sejam cabeçalhos de página: nome de órgão, "EDITAL", "MINISTÉRIO", números de página isolados, rodapés.
2. Reconecte itens numerados cujo conteúdo foi cortado pela virada de página.
3. Corrija palavras hifenizadas por quebra de coluna de PDF (ex: "Admi-nistração" → "Administração").
4. Una linhas que são continuação de uma frase cortada no meio.

COMO IDENTIFICAR UM ASSUNTO (raciocínio semântico, não mecânico):
- Um assunto é uma unidade de conhecimento que um candidato estudaria de forma independente.
- Ponto e vírgula (;) geralmente separa assuntos distintos.
- Vírgula pode separar assuntos distintos OU listar elementos do mesmo assunto — use o contexto:
  - "Lucro real, lucro presumido e lucro arbitrado" → 3 assuntos separados (regimes distintos)
  - "conceito, características e abrangência de empregado" → 1 assunto (aspectos do mesmo tema)
- Subitens numéricos (1.1, 4.3.2) são assuntos separados quando têm conteúdo próprio.
- Um item sem separador explícito mas com tema claramente distinto → novo assunto.
- Não separe artificialmente: "Balanço patrimonial" é 1 assunto, não quebre em partes.

REGRAS DE SAÍDA:
- Um assunto por item da lista.
- Sem numeração, sem marcadores, sem travessão — apenas o texto do assunto.
- Sem duplicatas.
- Mantenha a ordem original do edital.

CONTEÚDO BRUTO DA DISCIPLINA "${disciplina}":
${conteudo}`
}

// ---------------------------------------------------------------------------
// POST — verticaliza todas as disciplinas com conteúdo (ou uma individual)
//   Body opcional: { editalDisciplinaId: string } → processa só essa disciplina
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: editalId } = await params

    // Verifica se é verticalização individual
    let editalDisciplinaId: string | null = null
    try {
      const body = await req.json()
      editalDisciplinaId = body?.editalDisciplinaId ?? null
    } catch { /* body vazio = verticalizar todas */ }

    // Busca individual
    if (editalDisciplinaId) {
      const ed = await prisma.editalDisciplina.findUnique({
        where: { id: editalDisciplinaId, editalId },
        include: { disciplina: true },
      })
      if (!ed) return NextResponse.json({ error: 'Disciplina não encontrada' }, { status: 404 })
      if (!ed.conteudoProgramatico) return NextResponse.json({ error: 'Disciplina sem conteúdo programático' }, { status: 400 })

      const prompt = buildPrompt(ed.disciplina.nome, ed.conteudoProgramatico)
      const { assuntos } = await callIAStructured<Verticalizado>(
        prompt, 'salvar_verticalizado', SCHEMA_VERTICALIZADO, { temperature: 0 }
      )
      const verticalizado = assuntos.filter(Boolean).join('\n')
      await prisma.editalDisciplina.update({ where: { id: ed.id }, data: { conteudoVerticalizado: verticalizado } })
      console.log(`[verticalizar/individual] ${ed.disciplina.nome}: ${assuntos.length} assuntos`)
      return NextResponse.json({ success: true, verticalizado, assuntos: assuntos.length })
    }

    // Busca todas
    const edital = await prisma.edital.findUnique({
      where: { id: editalId },
      include: {
        disciplinas: {
          include: { disciplina: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!edital) return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 })

    const comConteudo = edital.disciplinas.filter(d => d.conteudoProgramatico)

    if (comConteudo.length === 0) {
      return NextResponse.json({ error: 'Nenhuma disciplina possui conteúdo programático' }, { status: 400 })
    }

    const resultados: { id: string; nome: string; ok: boolean }[] = []

    for (const ed of comConteudo) {
      const prompt = buildPrompt(ed.disciplina.nome, ed.conteudoProgramatico!)
      try {
        const { assuntos } = await callIAStructured<Verticalizado>(
          prompt,
          'salvar_verticalizado',
          SCHEMA_VERTICALIZADO,
          { temperature: 0 }
        )

        const verticalizado = assuntos.filter(Boolean).join('\n')

        await prisma.editalDisciplina.update({
          where: { id: ed.id },
          data: { conteudoVerticalizado: verticalizado },
        })

        resultados.push({ id: ed.id, nome: ed.disciplina.nome, ok: true })
        console.log(`[verticalizar] ${ed.disciplina.nome}: ${assuntos.length} assuntos`)
      } catch (err: any) {
        console.error(`[verticalizar] ${ed.disciplina.nome}: ERRO`, err?.message)
        resultados.push({ id: ed.id, nome: ed.disciplina.nome, ok: false })
      }
    }

    const salvos = resultados.filter(r => r.ok).length

    return NextResponse.json({ success: true, salvos, total: comConteudo.length, resultados })
  } catch (error) {
    console.error('[verticalizar] Erro geral:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE — limpa conteúdo verticalizado
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: editalId } = await params

    await prisma.editalDisciplina.updateMany({
      where: { editalId },
      data: { conteudoVerticalizado: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}
