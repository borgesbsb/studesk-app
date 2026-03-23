import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

function buildPrompt(disciplina: string, conteudo: string): string {
  return `Você é especialista em concursos públicos brasileiros e em editoração de editais verticalizados.

Sua tarefa é transformar o conteúdo programático bruto da disciplina "${disciplina}" em uma lista verticalizada — cada assunto em uma linha separada, de forma que o candidato consiga ler e marcar cada tópico individualmente.

COMO IDENTIFICAR UM ASSUNTO:
- Cada conceito, instituto, tema ou subtema cobrado é um assunto distinto.
- Listas separadas por ponto e vírgula (;), vírgula entre temas distintos, ou numeração sequencial indicam assuntos diferentes.
- Partes de uma mesma definição que formam um conceito único devem permanecer juntas na mesma linha.
- Exemplos: "Direitos e garantias fundamentais" é um assunto. "Controle de constitucionalidade difuso e concentrado" pode ser dividido em dois se forem temas distintos no edital.

REGRAS DE FORMATAÇÃO:
1. Um assunto por linha — sem marcadores, sem numeração, sem travessão inicial.
2. Corrija palavras quebradas por hifenização de PDF (ex: "Admi-nistração" → "Administração").
3. Una frases que foram quebradas no meio por artefato de cópia (linha termina no meio de uma sentença → continue na próxima).
4. Elimine linhas em branco, duplicatas e cabeçalhos de seção (ex: "CONTEÚDO PROGRAMÁTICO", "LÍNGUA PORTUGUESA").
5. Mantenha a ordem original do edital.
6. Retorne SOMENTE os assuntos, um por linha. Nenhum texto adicional.

CONTEÚDO BRUTO:
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
