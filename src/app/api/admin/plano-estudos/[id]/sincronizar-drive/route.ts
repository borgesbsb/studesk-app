/**
 * SSE — Sincronização de materiais do Google Drive com os ciclos do plano.
 *
 * Estrutura esperada no Drive:
 *   [pasta raiz]
 *     [disciplina] (ex: "1 - PORTUGUES")
 *       [ciclo] (ex: "CICLO 1")
 *         arquivo.pdf / video.mp4
 *
 * Eventos SSE:
 *   { tipo: 'inicio',     total: number }
 *   { tipo: 'progresso',  mensagem: string }
 *   { tipo: 'material',   nome: string, disciplina: string, ciclo: number }
 *   { tipo: 'aviso',      mensagem: string }
 *   { tipo: 'concluido',  criados: number, vinculados: number }
 *   { tipo: 'erro',       mensagem: string }
 */
import { NextRequest } from 'next/server'
import { google } from 'googleapis'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'

function sseEvent(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

// Normaliza nome para comparação: remove acentos, números isolados, chars especiais
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^\d+\s*[-–]\s*/, '') // remove prefixo "N - "
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrai número do ciclo de nomes como "CICLO 1", "Ciclo 2", "CICLO_3"
function extrairNumeroCiclo(nome: string): number | null {
  const match = nome.match(/ciclo\s*(\d+)/i)
  return match ? parseInt(match[1]) : null
}

// Match de nome do Drive para disciplina do plano (retorna melhor match)
function matchDisciplina(nomeDrive: string, disciplinas: { id: string; nome: string }[]) {
  const norm = normalizar(nomeDrive)
  let melhor: { id: string; nome: string } | null = null
  let melhorScore = 0

  for (const d of disciplinas) {
    const normD = normalizar(d.nome)
    // Verifica se um contém o outro
    if (normD.includes(norm) || norm.includes(normD)) {
      const score = Math.min(norm.length, normD.length) / Math.max(norm.length, normD.length)
      if (score > melhorScore) { melhorScore = score; melhor = d }
    } else {
      // Compara por palavras em comum
      const wordsA = norm.split(' ').filter(w => w.length > 3)
      const wordsB = normD.split(' ').filter(w => w.length > 3)
      const common = wordsA.filter(w => wordsB.includes(w)).length
      const score = common / Math.max(wordsA.length, wordsB.length, 1)
      if (score > 0.4 && score > melhorScore) { melhorScore = score; melhor = d }
    }
  }

  return melhor
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession()
  if (!session) return new Response('Não autorizado', { status: 401 })

  const { id: planoId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(sseEvent(data)))

      try {
        // Carrega plano com ciclos e disciplinas
        const plano = await prisma.planoEstudo.findUnique({
          where: { id: planoId },
          include: {
            semanas: {
              include: {
                disciplinas: { include: { disciplina: true } }
              },
              orderBy: { numeroSemana: 'asc' }
            }
          }
        })

        const folderId = new URL(req.url).searchParams.get('folderId') || plano?.driveFolderId

        if (!plano) { send({ tipo: 'erro', mensagem: 'Plano não encontrado' }); controller.close(); return }
        if (!folderId) { send({ tipo: 'erro', mensagem: 'Pasta do Drive não configurada' }); controller.close(); return }
        if (!plano.semanas.length) { send({ tipo: 'erro', mensagem: 'Nenhum ciclo encontrado no plano' }); controller.close(); return }

        // Carrega tokens do admin
        const admin = await prisma.admin.findUnique({
          where: { id: session.id },
          select: { googleDriveAccessToken: true, googleDriveRefreshToken: true }
        })
        if (!admin?.googleDriveAccessToken) { send({ tipo: 'erro', mensagem: 'Google Drive não conectado' }); controller.close(); return }

        // Configura cliente Drive
        const ADMIN_REDIRECT_URI = process.env.GOOGLE_ADMIN_REDIRECT_URI
          || `${process.env.NEXTAUTH_URL || 'http://localhost:3030'}/api/admin/google-drive/callback`

        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          ADMIN_REDIRECT_URI
        )
        oauth2Client.setCredentials({
          access_token: admin.googleDriveAccessToken,
          refresh_token: admin.googleDriveRefreshToken || undefined,
        })
        oauth2Client.on('tokens', async (tokens) => {
          if (tokens.access_token) {
            await prisma.admin.update({ where: { id: session.id }, data: { googleDriveAccessToken: tokens.access_token } })
          }
        })

        const drive = google.drive({ version: 'v3', auth: oauth2Client })

        const listarPasta = async (folderId: string) => {
          const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType, size)',
            orderBy: 'folder,name',
            pageSize: 500,
          })
          return res.data.files || []
        }

        // Coleta todas as disciplinas únicas do plano
        const disciplinasPlano = Object.values(
          Object.fromEntries(
            plano.semanas.flatMap(s => s.disciplinas).map(d => [d.disciplinaId, d.disciplina])
          )
        )

        // Lê subpastas do root (nível disciplina)
        send({ tipo: 'progresso', mensagem: 'Lendo estrutura do Google Drive…' })
        const pastasDisciplina = (await listarPasta(folderId))
          .filter(f => f.mimeType === 'application/vnd.google-apps.folder')

        send({ tipo: 'inicio', total: pastasDisciplina.length })

        let criados = 0
        let vinculados = 0

        for (const pastaDisciplina of pastasDisciplina) {
          const disciplinaMatch = matchDisciplina(pastaDisciplina.name!, disciplinasPlano)
          if (!disciplinaMatch) {
            send({ tipo: 'aviso', mensagem: `Sem match para disciplina: "${pastaDisciplina.name}"` })
            continue
          }

          send({ tipo: 'progresso', mensagem: `Disciplina: ${disciplinaMatch.nome}` })

          // Lê subpastas do nível ciclo
          const pastasCiclo = (await listarPasta(pastaDisciplina.id!))
            .filter(f => f.mimeType === 'application/vnd.google-apps.folder')

          for (const pastaCiclo of pastasCiclo) {
            const numCiclo = extrairNumeroCiclo(pastaCiclo.name!)
            if (numCiclo === null) {
              send({ tipo: 'aviso', mensagem: `Não reconheci ciclo: "${pastaCiclo.name}"` })
              continue
            }

            // Encontra a semana (ciclo) correspondente no plano
            const semana = plano.semanas.find(s => s.numeroSemana === numCiclo)
            if (!semana) {
              send({ tipo: 'aviso', mensagem: `Ciclo ${numCiclo} não existe no plano` })
              continue
            }

            // Encontra DisciplinaSemana para essa disciplina nesse ciclo
            const disciplinaSemana = semana.disciplinas.find(d => d.disciplinaId === disciplinaMatch.id)
            if (!disciplinaSemana) {
              send({ tipo: 'aviso', mensagem: `"${disciplinaMatch.nome}" não está no Ciclo ${numCiclo}` })
              continue
            }

            // Lê arquivos do ciclo
            const arquivos = (await listarPasta(pastaCiclo.id!))
              .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
              .filter(f => f.mimeType === 'application/pdf' || f.mimeType!.startsWith('video/'))

            for (const arquivo of arquivos) {
              const isPdf = arquivo.mimeType === 'application/pdf'
              const tipo = isPdf ? 'PDF' : 'VIDEO'

              try {
                // Verifica se material já existe com esse fileId
                let material = await prisma.materialEstudo.findFirst({
                  where: { googleDriveFileId: arquivo.id! }
                })

                if (!material) {
                  material = await prisma.materialEstudo.create({
                    data: {
                      nome: arquivo.name!.replace(/\.[^/.]+$/, ''), // remove extensão
                      tipo,
                      totalPaginas: isPdf ? 1 : 0,
                      googleDriveFileId: arquivo.id!,
                      googleDriveFileName: arquivo.name!,
                      fonteOrigem: `Google Drive: ${pastaDisciplina.name} / ${pastaCiclo.name}`,
                    }
                  })
                  criados++
                  send({ tipo: 'material', nome: arquivo.name!, disciplina: disciplinaMatch.nome, ciclo: numCiclo })
                }

                // Vincula ao ciclo (ignora se já vinculado)
                await prisma.disciplinaSemanaMateria.upsert({
                  where: { disciplinaSemanaId_materialId: { disciplinaSemanaId: disciplinaSemana.id, materialId: material.id } },
                  create: { disciplinaSemanaId: disciplinaSemana.id, materialId: material.id, ordem: vinculados },
                  update: {},
                })
                vinculados++
              } catch (err: any) {
                send({ tipo: 'aviso', mensagem: `Erro em "${arquivo.name}": ${err.message}` })
              }
            }
          }
        }

        send({ tipo: 'concluido', criados, vinculados })
      } catch (err: any) {
        send({ tipo: 'erro', mensagem: err?.message || 'Erro interno' })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
