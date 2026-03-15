import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { handleCors } from '@/lib/cors'
import { requireAuth } from '@/lib/auth-helpers'

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { id } = await params
    const materialId = id

    console.log('📚 API - Buscando histórico de leitura:', { materialId, userId: session.user.id })

    // Verificar se o material existe (do usuário ou admin)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        OR: [{ userId: session.user.id }, { userId: null }]
      },
      select: { id: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Busca o histórico de leitura do usuário ordenado por data (inclui registros legados sem userId)
    const historico = await prisma.historicoLeitura.findMany({
      where: { materialId, OR: [{ userId: session.user.id }, { userId: null }] },
      orderBy: { dataLeitura: 'desc' },
      select: {
        id: true,
        paginaAtual: true,
        tempoLeituraSegundos: true,
        assuntosEstudados: true,
        dataLeitura: true,
        createdAt: true
      }
    })

    console.log('✅ API - Histórico encontrado:', { count: historico.length })

    return NextResponse.json({
      success: true,
      historico
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('❌ API - Erro ao buscar histórico de leitura:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de leitura' },
      { status: 500, headers: handleCors(request) }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { sessaoId, assuntosEstudados } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Atualizando assuntos da sessão:', {
      materialId,
      sessaoId,
      assuntosEstudados,
      userId: session.user.id
    })

    // Verificar se o material existe e pertence ao usuário
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      },
      select: { id: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Verifica se a sessão existe e pertence ao material
    const sessaoExistente = await prisma.historicoLeitura.findFirst({
      where: {
        id: sessaoId,
        materialId: materialId
      }
    })

    if (!sessaoExistente) {
      console.log('❌ API - Sessão não encontrada:', { sessaoId, materialId })
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Atualiza os assuntos estudados
    const sessaoAtualizada = await prisma.historicoLeitura.update({
      where: { id: sessaoId },
      data: {
        assuntosEstudados: assuntosEstudados || null
      }
    })

    console.log('✅ API - Assuntos da sessão atualizados:', sessaoAtualizada)

    return NextResponse.json({
      success: true,
      sessao: sessaoAtualizada,
      message: 'Assuntos atualizados com sucesso'
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('❌ API - Erro ao atualizar assuntos da sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar assuntos da sessão' },
      { status: 500, headers: handleCors(request) }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Verificar autenticação (suporta NextAuth e JWT)
    let auth
    try {
      auth = await requireAuth()
    } catch (authError) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { paginaAtual, tempoLeituraSegundos, assuntosEstudados, dataEstudo } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Salvando histórico de leitura:', {
      materialId,
      paginaAtual,
      tempoLeituraSegundos,
      assuntosEstudados,
      userId: auth.userId
    })

    // Verifica se o material existe (do usuário ou admin)
    const materialExistente = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        OR: [
          { userId: auth.userId },
          { userId: null }
        ]
      },
      select: { id: true, nome: true, tipo: true, totalPaginas: true, userId: true }
    })

    if (!materialExistente) {
      console.log('❌ API - Material não encontrado:', materialId)
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Valida os dados de acordo com o tipo de material
    if (materialExistente.tipo === 'VIDEO') {
      // Para vídeos, paginaAtual representa segundos do vídeo
      if (!Number.isInteger(paginaAtual) || paginaAtual < 0) {
        return NextResponse.json(
          { error: 'Tempo do vídeo inválido' },
          { status: 400, headers: handleCors(request) }
        )
      }
    } else {
      // Para PDFs, valida contra totalPaginas (ignora limite superior se totalPaginas não foi definido)
      const maxPagina = materialExistente.totalPaginas > 0 ? materialExistente.totalPaginas : Infinity
      if (!Number.isInteger(paginaAtual) || paginaAtual < 1 || paginaAtual > maxPagina) {
        return NextResponse.json(
          { error: 'Página atual inválida' },
          { status: 400, headers: handleCors(request) }
        )
      }
    }

    if (!Number.isInteger(tempoLeituraSegundos) || tempoLeituraSegundos < 0) {
      return NextResponse.json(
        { error: 'Tempo de leitura inválido' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Cria o registro no histórico de leitura
    const historicoLeitura = await prisma.historicoLeitura.create({
      data: {
        materialId,
        userId: auth.userId,
        paginaAtual,
        tempoLeituraSegundos,
        assuntosEstudados: assuntosEstudados || null,
        dataLeitura: new Date()
      }
    })

    // Atualiza o progresso no MaterialEstudo (paginasLidas) — apenas para materiais do próprio usuário
    if (materialExistente.tipo === 'PDF' && materialExistente.userId === auth.userId) {
      await prisma.materialEstudo.update({
        where: { id: materialId },
        data: { paginasLidas: paginaAtual }
      })
    }

    console.log('✅ API - Histórico de leitura salvo:', historicoLeitura)

    // ============================================
    // Atualizar DisciplinaDia se estiver programada para hoje
    // ============================================
    let horasAdicionadas = 0
    let disciplinasAtualizadas: string[] = []

    console.log('\n🔍 ===== DEBUG: ATUALIZAÇÃO DO PLANO DE ESTUDOS =====')
    console.log('📝 Material ID:', materialId)
    console.log('⏱️  Tempo lido (segundos):', tempoLeituraSegundos)
    console.log('⏱️  Tempo lido (horas):', (tempoLeituraSegundos / 3600).toFixed(4))

    try {
      // Usar data enviada pelo cliente (dia selecionado no /hoje) ou data atual do servidor
      const agora = dataEstudo ? new Date(`${dataEstudo}T12:00:00Z`) : new Date()
      const todayUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
      const tomorrowUTC = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate() + 1))

      console.log(`📅 dataEstudo recebido: ${dataEstudo ?? 'nenhum (usando agora)'}`)
      console.log(`📅 todayUTC: ${todayUTC.toISOString()} | tomorrowUTC: ${tomorrowUTC.toISOString()}`)

      // 1a. Buscar via DisciplinaMaterial (planos pessoais)
      const disciplinasDoMaterial = await prisma.disciplinaMaterial.findMany({
        where: { materialId },
        select: { disciplinaId: true, disciplina: { select: { nome: true } } }
      })

      // 1b. Buscar via DisciplinaSemanaMateria (planos compartilhados/admin)
      // — direto na DisciplinaSemana ativa para o período consultado
      const semanaMateriasAdmin = disciplinasDoMaterial.length === 0
        ? await prisma.disciplinaSemanaMateria.findMany({
            where: { materialId },
            include: {
              disciplinaSemana: {
                include: {
                  disciplina: { select: { id: true, nome: true } },
                  semana: {
                    select: {
                      dataInicio: true,
                      dataFim: true,
                      planoId: true,
                      plano: { select: { nome: true, ativo: true, userId: true } }
                    }
                  },
                  dias: true
                }
              }
            }
          })
        : []

      console.log(`📚 Via DisciplinaMaterial: ${disciplinasDoMaterial.length} | Via DisciplinaSemanaMateria: ${semanaMateriasAdmin.length}`)

      // — Processar materiais admin direto (caminho curto, sem re-buscar DisciplinaSemana)
      if (semanaMateriasAdmin.length > 0) {
        for (const { disciplinaSemana } of semanaMateriasAdmin) {
          const semana = disciplinaSemana.semana
          // Verificar se a semana contém o dia consultado
          const semanaInicio = new Date(Date.UTC(
            new Date(semana.dataInicio).getUTCFullYear(),
            new Date(semana.dataInicio).getUTCMonth(),
            new Date(semana.dataInicio).getUTCDate()
          ))
          const semanaFim = new Date(Date.UTC(
            new Date(semana.dataFim).getUTCFullYear(),
            new Date(semana.dataFim).getUTCMonth(),
            new Date(semana.dataFim).getUTCDate()
          ))
          if (todayUTC < semanaInicio || todayUTC > semanaFim) {
            console.log(`   ⚠️ DisciplinaSemana fora do período consultado, pulando`)
            continue
          }
          if (!semana.plano.ativo) continue

          const diffDays = Math.round((todayUTC.getTime() - semanaInicio.getTime()) / (1000 * 60 * 60 * 24))
          const diaKey = `dia${diffDays + 1}`
          console.log(`   📆 Admin: ${disciplinaSemana.disciplina.nome} → ${diaKey}`)

          const horasAdicionar = tempoLeituraSegundos / 3600
          let diaHoje = disciplinaSemana.dias.find(d => d.dia === diaKey)
          if (!diaHoje) {
            diaHoje = await prisma.disciplinaDia.create({
              data: { disciplinaSemanaId: disciplinaSemana.id, dia: diaKey, minutosPlanejados: 0, horasRealizadas: 0, questoesPlanejadas: 0, questoesRealizadas: 0 }
            })
          }
          await prisma.disciplinaDia.update({
            where: { id: diaHoje.id },
            data: { horasRealizadas: { increment: horasAdicionar } }
          })

          // Plano compartilhado: upsert ProgressoUsuarioDisciplinaDia
          if (semana.plano.userId === null) {
            try {
              const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
                where: { planoId_userId: { planoId: semana.planoId, userId: auth.userId } }
              })
              if (planoUsuario) {
                const progresso = await prisma.progressoUsuarioDisciplina.upsert({
                  where: { planoUsuarioId_disciplinaSemanaId: { planoUsuarioId: planoUsuario.id, disciplinaSemanaId: disciplinaSemana.id } },
                  create: {
                    planoUsuarioId: planoUsuario.id,
                    disciplinaSemanaId: disciplinaSemana.id,
                    minutosPlanejados: disciplinaSemana.minutosPlanejados,
                    questoesPlanejadas: disciplinaSemana.questoesPlanejadas,
                    horasRealizadas: 0,
                    questoesRealizadas: 0,
                    concluida: false,
                    removida: false,
                  },
                  update: {}
                })
                await prisma.progressoUsuarioDisciplinaDia.upsert({
                  where: { progressoId_dia: { progressoId: progresso.id, dia: diaKey } },
                  create: { progressoId: progresso.id, dia: diaKey, horasRealizadas: horasAdicionar, questoesPlanejadas: 0, questoesRealizadas: 0 },
                  update: { horasRealizadas: { increment: horasAdicionar } }
                })
                console.log(`   ✅ ProgressoUsuarioDisciplinaDia atualizado (admin path)`)
              }
            } catch (sharedErr) {
              console.error('⚠️ Erro ao atualizar progresso compartilhado:', sharedErr)
            }
          }

          horasAdicionadas += horasAdicionar
          disciplinasAtualizadas.push(disciplinaSemana.disciplina.nome)
        }
      }

      if (disciplinasDoMaterial.length > 0) {
        // 2. Para cada disciplina, buscar DisciplinaSemana ativa para a semana atual
        for (const { disciplinaId, disciplina } of disciplinasDoMaterial) {
          console.log(`\n🔍 Processando disciplina: ${disciplina.nome}`)

          const disciplinaSemanaAtiva = await prisma.disciplinaSemana.findFirst({
            where: {
              disciplinaId,
              semana: {
                dataInicio: { lt: tomorrowUTC },
                dataFim: { gte: todayUTC },
                plano: { ativo: true }
              }
            },
            include: {
              semana: {
                select: {
                  dataInicio: true,
                  dataFim: true,
                  planoId: true,
                  plano: {
                    select: {
                      nome: true,
                      ativo: true,
                      userId: true
                    }
                  }
                }
              },
              dias: true
            }
          })

          if (!disciplinaSemanaAtiva) {
            console.log(`   ❌ Disciplina ${disciplina.nome} não está em nenhum plano ativo`)
            continue
          }

          console.log(`   ✅ Encontrou DisciplinaSemana ativa:`)
          console.log(`      Plano: ${disciplinaSemanaAtiva.semana.plano.nome}`)
          console.log(`      Semana: ${disciplinaSemanaAtiva.semana.dataInicio.toISOString()} até ${disciplinaSemanaAtiva.semana.dataFim.toISOString()}`)

          // Calcular diaKey usando UTC para evitar bug de timezone
          const inicioUTC = new Date(Date.UTC(
            disciplinaSemanaAtiva.semana.dataInicio.getUTCFullYear(),
            disciplinaSemanaAtiva.semana.dataInicio.getUTCMonth(),
            disciplinaSemanaAtiva.semana.dataInicio.getUTCDate()
          ))
          const diffDays = Math.round((todayUTC.getTime() - inicioUTC.getTime()) / (1000 * 60 * 60 * 24))
          const diaKey = `dia${diffDays + 1}`

          console.log(`   📆 Dia do ciclo: ${diaKey} (diff=${diffDays})`)

          // Buscar o DisciplinaDia correspondente ao dia atual do ciclo
          let diaHoje = disciplinaSemanaAtiva.dias.find(d => d.dia === diaKey)

          // Se não existe DisciplinaDia para hoje, criar um (o usuário estudou fora do planejado)
          if (!diaHoje) {
            console.log(`   ⚠️ ${diaKey} não encontrado, criando DisciplinaDia...`)
            diaHoje = await prisma.disciplinaDia.create({
              data: {
                disciplinaSemanaId: disciplinaSemanaAtiva.id,
                dia: diaKey,
                minutosPlanejados: 0,
                horasRealizadas: 0,
                questoesPlanejadas: 0,
                questoesRealizadas: 0
              }
            })
            console.log(`   ✅ DisciplinaDia criado: ${diaHoje.id}`)
          } else {
            console.log(`   ✅ Encontrou ${diaKey}: horas realizadas (antes): ${diaHoje.horasRealizadas}`)
          }

          // Atualizar horasRealizadas do dia atual
          const horasAdicionar = tempoLeituraSegundos / 3600 // converter segundos para horas

          const updated = await prisma.disciplinaDia.update({
            where: { id: diaHoje.id },
            data: {
              horasRealizadas: { increment: horasAdicionar }
            }
          })

          console.log(`   ✅ +${horasAdicionar.toFixed(4)}h para ${disciplina.nome} - ${diaKey} (total: ${updated.horasRealizadas})`)

          // Para planos compartilhados (userId=null), também atualizar ProgressoUsuarioDisciplinaDia
          if (disciplinaSemanaAtiva.semana.plano.userId === null) {
            try {
              const planoUsuario = await prisma.planoEstudoUsuario.findUnique({
                where: { planoId_userId: { planoId: disciplinaSemanaAtiva.semana.planoId, userId: auth.userId } }
              })
              if (planoUsuario) {
                // Upsert ProgressoUsuarioDisciplina — pode não existir se o usuário nunca configurou dias
                const progresso = await prisma.progressoUsuarioDisciplina.upsert({
                  where: { planoUsuarioId_disciplinaSemanaId: { planoUsuarioId: planoUsuario.id, disciplinaSemanaId: disciplinaSemanaAtiva.id } },
                  create: {
                    planoUsuarioId: planoUsuario.id,
                    disciplinaSemanaId: disciplinaSemanaAtiva.id,
                    minutosPlanejados: disciplinaSemanaAtiva.minutosPlanejados,
                    questoesPlanejadas: disciplinaSemanaAtiva.questoesPlanejadas,
                    horasRealizadas: 0,
                    questoesRealizadas: 0,
                    concluida: false,
                    removida: false,
                  },
                  update: {}
                })
                await prisma.progressoUsuarioDisciplinaDia.upsert({
                  where: { progressoId_dia: { progressoId: progresso.id, dia: diaKey } },
                  create: { progressoId: progresso.id, dia: diaKey, horasRealizadas: horasAdicionar, questoesPlanejadas: 0, questoesRealizadas: 0 },
                  update: { horasRealizadas: { increment: horasAdicionar } }
                })
                console.log(`   ✅ ProgressoUsuarioDisciplinaDia atualizado para plano compartilhado`)
              }
            } catch (sharedErr) {
              console.error('⚠️ Erro ao atualizar ProgressoUsuarioDisciplinaDia:', sharedErr)
            }
          }

          horasAdicionadas += horasAdicionar
          disciplinasAtualizadas.push(disciplina.nome)
        }
      }

      console.log(`\n📊 ===== RESUMO DA ATUALIZAÇÃO =====`)
      console.log(`✅ Horas adicionadas: ${horasAdicionadas.toFixed(4)}h`)
      console.log(`📚 Disciplinas atualizadas: ${disciplinasAtualizadas.join(', ') || 'Nenhuma'}`)
      console.log(`====================================\n`)

    } catch (error) {
      // Não falhar a request se houver erro ao atualizar plano
      console.error('⚠️ Erro ao atualizar plano de estudos (não crítico):', error)
    }

    const mensagem = assuntosEstudados
      ? `Sessão de estudo salva: página ${paginaAtual}, ${Math.floor(tempoLeituraSegundos / 60)}min ${tempoLeituraSegundos % 60}s, assuntos registrados`
      : `Histórico de leitura salvo: página ${paginaAtual}, ${Math.floor(tempoLeituraSegundos / 60)}min ${tempoLeituraSegundos % 60}s`

    return NextResponse.json({
      success: true,
      historicoLeitura,
      message: mensagem,
      planoAtualizado: disciplinasAtualizadas.length > 0,
      horasAdicionadas: horasAdicionadas,
      disciplinasAtualizadas: disciplinasAtualizadas
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('❌ API - Erro ao salvar histórico de leitura:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar histórico de leitura' },
      { status: 500, headers: handleCors(request) }
    )
  }
} 

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, headers: handleCors(request) }
      )
    }

    const { sessaoId } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('🗑️ API - Excluindo mini sessão:', {
      materialId,
      sessaoId,
      userId: session.user.id
    })

    if (!sessaoId) {
      return NextResponse.json(
        { error: 'ID da sessão é obrigatório' },
        { status: 400, headers: handleCors(request) }
      )
    }

    // Verificar se o material existe e pertence ao usuário
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      },
      select: { id: true }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Verificar se a sessão existe e pertence ao material
    const sessaoExistente = await prisma.historicoLeitura.findFirst({
      where: {
        id: sessaoId,
        materialId: materialId
      }
    })

    if (!sessaoExistente) {
      return NextResponse.json(
        { error: 'Mini sessão não encontrada' },
        { status: 404, headers: handleCors(request) }
      )
    }

    // Deletar a mini sessão
    await prisma.historicoLeitura.delete({
      where: { id: sessaoId }
    })

    console.log('✅ API - Mini sessão excluída com sucesso:', {
      sessaoId,
      materialId
    })

    return NextResponse.json({
      success: true,
      message: 'Mini sessão excluída com sucesso'
    }, { headers: handleCors(request) })
  } catch (error) {
    console.error('❌ API - Erro ao excluir mini sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir mini sessão' },
      { status: 500, headers: handleCors(request) }
    )
  }
} 