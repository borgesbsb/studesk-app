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

    // Busca o histórico de leitura ordenado por data
    const historico = await prisma.historicoLeitura.findMany({
      where: { materialId },
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

    const { paginaAtual, tempoLeituraSegundos, assuntosEstudados } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Salvando histórico de leitura:', {
      materialId,
      paginaAtual,
      tempoLeituraSegundos,
      assuntosEstudados,
      userId: auth.userId
    })

    // Verifica se o material existe e pertence ao usuário
    const materialExistente = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: auth.userId
      },
      select: { id: true, nome: true, tipo: true, totalPaginas: true }
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
      // Para PDFs, valida contra totalPaginas
      if (!Number.isInteger(paginaAtual) || paginaAtual < 1 || paginaAtual > materialExistente.totalPaginas) {
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
        paginaAtual,
        tempoLeituraSegundos,
        assuntosEstudados: assuntosEstudados || null,
        dataLeitura: new Date()
      }
    })

    // Atualiza o progresso no MaterialEstudo (paginasLidas)
    if (materialExistente.tipo === 'PDF') {
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
      // 1. Buscar disciplinas associadas ao material
      const disciplinasDoMaterial = await prisma.disciplinaMaterial.findMany({
        where: { materialId },
        select: {
          disciplinaId: true,
          disciplina: {
            select: { nome: true }
          }
        }
      })

      console.log('📚 Disciplinas associadas ao material:', disciplinasDoMaterial.length)
      disciplinasDoMaterial.forEach(d => {
        console.log(`   - ${d.disciplina.nome} (ID: ${d.disciplinaId})`)
      })

      if (disciplinasDoMaterial.length > 0) {
        const agora = new Date()
        const inicioDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0)
        const fimDoDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999)

        console.log(`\n📅 Data/Hora atual: ${agora.toISOString()}`)
        console.log(`📅 Início do dia: ${inicioDoDia.toISOString()}`)
        console.log(`📅 Fim do dia: ${fimDoDia.toISOString()}`)

        // 2. Para cada disciplina, buscar DisciplinaSemana ativa para a semana atual
        for (const { disciplinaId, disciplina } of disciplinasDoMaterial) {
          console.log(`\n🔍 Processando disciplina: ${disciplina.nome}`)

          const disciplinaSemanaAtiva = await prisma.disciplinaSemana.findFirst({
            where: {
              disciplinaId,
              semana: {
                dataInicio: { lte: fimDoDia },
                dataFim: { gte: inicioDoDia },
                plano: { ativo: true }
              }
            },
            include: {
              semana: {
                select: {
                  dataInicio: true,
                  dataFim: true,
                  plano: {
                    select: {
                      nome: true,
                      ativo: true
                    }
                  }
                }
              },
              dias: true // Buscar TODOS os dias, filtraremos depois
            }
          })

          if (!disciplinaSemanaAtiva) {
            console.log(`   ❌ Disciplina ${disciplina.nome} não está em nenhum plano ativo`)
            console.log(`      (Procurando plano ativo com semana entre ${inicioDoDia.toISOString()} e ${fimDoDia.toISOString()})`)
            continue
          }

          console.log(`   ✅ Encontrou DisciplinaSemana ativa:`)
          console.log(`      Plano: ${disciplinaSemanaAtiva.semana.plano.nome}`)
          console.log(`      Semana: ${disciplinaSemanaAtiva.semana.dataInicio.toISOString()} até ${disciplinaSemanaAtiva.semana.dataFim.toISOString()}`)
          console.log(`      Dias cadastrados: ${disciplinaSemanaAtiva.dias.length}`)
          console.log(`      Dias: ${disciplinaSemanaAtiva.dias.map(d => d.dia).join(', ')}`)

          // Calcular qual é o dia do ciclo (dia1, dia2, etc.) baseado na data de início do ciclo
          const inicioNormalizado = new Date(disciplinaSemanaAtiva.semana.dataInicio)
          inicioNormalizado.setHours(0, 0, 0, 0)
          const consultadaNormalizada = new Date(agora)
          consultadaNormalizada.setHours(0, 0, 0, 0)
          const diffTime = consultadaNormalizada.getTime() - inicioNormalizado.getTime()
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          const diaKey = `dia${diffDays + 1}`

          console.log(`   📆 Cálculo do dia do ciclo:`)
          console.log(`      Início do ciclo: ${inicioNormalizado.toISOString()}`)
          console.log(`      Hoje: ${consultadaNormalizada.toISOString()}`)
          console.log(`      Diferença (ms): ${diffTime}`)
          console.log(`      Diferença (dias): ${diffDays}`)
          console.log(`      Dia do ciclo: ${diaKey}`)

          // Buscar o DisciplinaDia correspondente ao dia atual do ciclo
          const diaHoje = disciplinaSemanaAtiva.dias.find(d => d.dia === diaKey)

          if (!diaHoje) {
            console.log(`   ❌ ${diaKey} não encontrado nos dias cadastrados`)
            console.log(`      Dias disponíveis: ${disciplinaSemanaAtiva.dias.map(d => d.dia).join(', ')}`)
          } else {
            console.log(`   ✅ Encontrou ${diaKey}:`)
            console.log(`      ID: ${diaHoje.id}`)
            console.log(`      Horas planejadas: ${diaHoje.horasPlanejadas}`)
            console.log(`      Horas realizadas (antes): ${diaHoje.horasRealizadas}`)
          }

          if (diaHoje) {
            // 3. Atualizar horasRealizadas do dia atual
            const horasAdicionar = tempoLeituraSegundos / 3600 // converter segundos para horas

            console.log(`   🔄 Atualizando DisciplinaDia...`)
            console.log(`      Incrementando: ${horasAdicionar.toFixed(4)}h`)

            const updated = await prisma.disciplinaDia.update({
              where: { id: diaHoje.id },
              data: {
                horasRealizadas: { increment: horasAdicionar }
              }
            })

            console.log(`   ✅ DisciplinaDia atualizado!`)
            console.log(`      Horas realizadas (depois): ${updated.horasRealizadas}`)

            horasAdicionadas += horasAdicionar
            disciplinasAtualizadas.push(disciplina.nome)

            console.log(`   ✅ Tempo adicionado ao plano: ${horasAdicionar.toFixed(4)}h para ${disciplina.nome} - ${diaKey}`)
          } else {
            console.log(`   ❌ Disciplina ${disciplina.nome} não está programada para ${diaKey}`)
          }
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