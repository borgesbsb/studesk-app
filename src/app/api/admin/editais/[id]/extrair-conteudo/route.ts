/**
 * SSE — Extração de conteúdo programático disciplina por disciplina.
 *
 * Faz Pass 1 (mapeamento de páginas) e depois extrai cada disciplina
 * individualmente, salvando no banco conforme avança.
 *
 * Eventos SSE:
 *   { tipo: 'inicio',     total: number }
 *   { tipo: 'progresso',  atual: number, total: number, disciplina: string }
 *   { tipo: 'salvo',      disciplinaId: string, nome: string }
 *   { tipo: 'erro_disc',  nome: string, erro: string }
 *   { tipo: 'concluido',  salvos: number, erros: number }
 *   { tipo: 'erro',       mensagem: string }
 */
import { NextRequest } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import path from 'path'
import fs from 'fs/promises'

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) {
    return new Response('Não autorizado', { status: 401 })
  }

  const { id: editalId } = await params

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(sseEvent(data)))
      }

      try {
        // Busca edital com disciplinas e pdfPath
        const edital = await prisma.edital.findUnique({
          where: { id: editalId },
          include: {
            disciplinas: {
              include: { disciplina: true },
            },
          },
        })

        if (!edital) {
          send({ tipo: 'erro', mensagem: 'Edital não encontrado' })
          controller.close()
          return
        }

        if (!edital.pdfPath) {
          send({ tipo: 'erro', mensagem: 'PDF não encontrado. Faça o upload do edital primeiro.' })
          controller.close()
          return
        }

        if (!edital.disciplinas.length) {
          send({ tipo: 'erro', mensagem: 'Nenhuma disciplina cadastrada neste edital.' })
          controller.close()
          return
        }

        const anthropicKey = process.env.ANTHROPIC_API_KEY
        if (!anthropicKey) {
          send({ tipo: 'erro', mensagem: 'ANTHROPIC_API_KEY não configurada' })
          controller.close()
          return
        }

        // Lê o PDF do disco
        const pdfFullPath = path.join(process.cwd(), 'public', edital.pdfPath)
        const buffer = await fs.readFile(pdfFullPath)
        const pdfBase64 = buffer.toString('base64')

        const client = new Anthropic({ apiKey: anthropicKey })
        const cargo = edital.cargo || ''
        const disciplinas = edital.disciplinas

        send({ tipo: 'inicio', total: disciplinas.length })

        let salvos = 0
        let erros = 0

        for (let i = 0; i < disciplinas.length; i++) {
          const ed = disciplinas[i]
          const nomeDisciplina = ed.disciplina.nome

          send({ tipo: 'progresso', atual: i + 1, total: disciplinas.length, disciplina: nomeDisciplina })

          try {
            const message = await client.messages.create({
              model: 'claude-haiku-4-5-20251001',
              max_tokens: 4096,
              tools: [{
                name: 'salvar_conteudo',
                description: 'Salva o conteúdo programático da disciplina',
                input_schema: {
                  type: 'object' as const,
                  properties: {
                    conteudo: {
                      type: 'string',
                      description: 'Conteúdo programático completo e exato da disciplina como aparece no edital',
                    },
                  },
                  required: ['conteudo'],
                },
              }],
              tool_choice: { type: 'tool', name: 'salvar_conteudo' },
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'document',
                    source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 },
                  },
                  {
                    type: 'text',
                    text: `Localize no conteúdo programático do cargo "${cargo}" a disciplina "${nomeDisciplina}" e copie seu conteúdo programático completo e exato, sem resumir ou alterar nada. Não inclua o nome da disciplina no campo conteudo. Se não encontrar, retorne conteudo vazio.`,
                  },
                ],
              }],
            })

            const toolUse = message.content.find(b => b.type === 'tool_use')
            const conteudo = (toolUse?.type === 'tool_use' ? (toolUse.input as any).conteudo : '') || ''

            await prisma.editalDisciplina.update({
              where: { id: ed.id },
              data: { conteudoProgramatico: conteudo },
            })

            salvos++
            send({ tipo: 'salvo', disciplinaId: ed.id, nome: nomeDisciplina, conteudo })
          } catch (err: any) {
            erros++
            send({ tipo: 'erro_disc', nome: nomeDisciplina, erro: err?.message || 'Erro desconhecido' })
          }
        }

        send({ tipo: 'concluido', salvos, erros })
      } catch (err: any) {
        send({ tipo: 'erro', mensagem: err?.message || 'Erro interno' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
