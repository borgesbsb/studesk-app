import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

function buildPrompt(disciplina: string, conteudo: string): string {
  return `Você é especialista em concursos públicos brasileiros e em editoração de editais verticalizados.

Sua tarefa é transformar o conteúdo programático bruto da disciplina "${disciplina}" em uma lista verticalizada — cada assunto em uma linha separada, de forma que o candidato consiga ler e marcar cada tópico individualmente durante os estudos.

PRÉ-PROCESSAMENTO (faça antes de verticalizar):
1. Ignore completamente linhas que sejam cabeçalhos de página: nome de órgão, "EDITAL", "MINISTÉRIO", números de página isolados, rodapés.
2. Reconecte itens numerados cujo conteúdo foi cortado pela virada de página (ex: "20." em uma linha e o texto na linha seguinte após um cabeçalho).
3. Corrija palavras hifenizadas por quebra de coluna de PDF (ex: "Admi-nistração" → "Administração").
4. Una linhas que são continuação de uma frase cortada no meio — o texto deve fluir como um parágrafo contínuo antes de ser verticalizado.

COMO IDENTIFICAR UM ASSUNTO (raciocínio semântico, não mecânico):
- Um assunto é uma unidade de conhecimento que um candidato estudaria de forma independente.
- Ponto e vírgula (;) geralmente separa assuntos distintos.
- Vírgula pode separar assuntos distintos OU listar elementos do mesmo assunto — use o contexto para decidir.
  - "Lucro real, lucro presumido e lucro arbitrado" → 3 assuntos separados (são regimes distintos de tributação).
  - "conceito, características e abrangência de empregado" → 1 assunto (são aspectos do mesmo tema).
- Subitens numéricos (1.1, 4.3.2) são assuntos separados quando têm conteúdo próprio.
- Um item sem separador explícito mas com tema claramente distinto do anterior → nova linha.
- Não separe artificialmente: "Balanço patrimonial" é 1 assunto, não quebre em partes.

REGRAS DE SAÍDA:
1. Um assunto por linha.
2. Sem numeração, sem marcadores, sem travessão inicial — apenas o texto do assunto.
3. Sem linhas em branco entre assuntos.
4. Sem duplicatas.
5. Mantenha a ordem original do edital.
6. Retorne SOMENTE os assuntos, um por linha. Nenhum outro texto.

CONTEÚDO BRUTO DA DISCIPLINA "${disciplina}":
${conteudo}`
}

async function callIA(prompt: string, groqKey?: string, openaiKey?: string): Promise<string> {
  if (groqKey) {
    try {
      const groq = new OpenAI({ apiKey: groqKey, baseURL: 'https://api.groq.com/openai/v1' })
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) return content
    } catch (err: any) {
      console.warn('[verticalizar] Groq falhou:', err?.message)
    }
  }

  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      })
      const content = res.choices[0]?.message?.content?.trim()
      if (content) return content
    } catch (err: any) {
      console.warn('[verticalizar] OpenAI falhou:', err?.message)
    }
  }

  throw new Error('Nenhum provedor de IA disponível')
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: editalId } = await params

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

    const groqKey = process.env.GROQ_API_KEY
    const openaiKey = process.env.OPENAI_API_KEY

    if (!groqKey && !openaiKey) {
      return NextResponse.json({ error: 'Nenhuma chave de IA configurada' }, { status: 500 })
    }

    const resultados: { id: string; nome: string; ok: boolean }[] = []

    for (const ed of comConteudo) {
      const prompt = buildPrompt(ed.disciplina.nome, ed.conteudoProgramatico!)
      try {
        const verticalizado = await callIA(prompt, groqKey, openaiKey)
        await prisma.editalDisciplina.update({
          where: { id: ed.id },
          data: { conteudoVerticalizado: verticalizado },
        })
        resultados.push({ id: ed.id, nome: ed.disciplina.nome, ok: true })
        console.log(`[verticalizar] ${ed.disciplina.nome}: OK`)
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
