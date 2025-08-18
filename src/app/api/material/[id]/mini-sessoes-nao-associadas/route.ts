import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const materialId = id

    console.log('📚 API - Buscando mini sessões não associadas:', { materialId })

    // Buscar histórico de leitura que não tem assuntos estudados (não foi associado a uma sessão)
    const miniSessoes = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        OR: [
          { assuntosEstudados: null }, // Mini sessões sem assunto
          { 
            AND: [
              { assuntosEstudados: { not: null } }, // Com assunto
              { nomeSessao: { startsWith: 'Mini Sessão -' } } // Mas são mini sessões individuais
            ]
          }
        ]
      },
      orderBy: {
        dataLeitura: 'asc'
      },
      select: {
        id: true,
        paginaAtual: true,
        tempoLeituraSegundos: true,
        dataLeitura: true,
        createdAt: true,
        assuntosEstudados: true,
        nomeSessao: true
      }
    })

    console.log(`✅ API - ${miniSessoes.length} mini sessões não associadas encontradas`)

    // Calcular estatísticas
    const totalTempo = miniSessoes.reduce((acc, sessao) => acc + sessao.tempoLeituraSegundos, 0)
    const totalMinutos = Math.round(totalTempo / 60)
    const paginasUnicas = new Set(miniSessoes.map(s => s.paginaAtual)).size

    const estatisticas = {
      totalMiniSessoes: miniSessoes.length,
      totalTempoMinutos: totalMinutos,
      totalTempoSegundos: totalTempo,
      paginasUnicas,
      periodoInicio: miniSessoes.length > 0 ? miniSessoes[0].dataLeitura : null,
      periodoFim: miniSessoes.length > 0 ? miniSessoes[miniSessoes.length - 1].dataLeitura : null
    }

    return NextResponse.json({ 
      success: true, 
      miniSessoes,
      estatisticas,
      message: `${miniSessoes.length} mini sessões disponíveis para associação`
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar mini sessões não associadas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar mini sessões não associadas' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { sessaoIds, assuntosEstudados, nomeSessao } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Criando sessão de estudo:', { 
      materialId, 
      sessaoIds, 
      assuntosEstudados,
      nomeSessao 
    })

    if (!sessaoIds || !Array.isArray(sessaoIds) || sessaoIds.length === 0) {
      return NextResponse.json(
        { error: 'Lista de sessões é obrigatória' },
        { status: 400 }
      )
    }

    if (!assuntosEstudados || assuntosEstudados.trim() === '') {
      return NextResponse.json(
        { error: 'Assuntos estudados são obrigatórios' },
        { status: 400 }
      )
    }

    if (!nomeSessao || nomeSessao.trim() === '') {
      return NextResponse.json(
        { error: 'Nome da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se as sessões existem e pertencem ao material
    const sessoesExistentes = await prisma.historicoLeitura.findMany({
      where: {
        id: { in: sessaoIds },
        materialId: materialId,
        OR: [
          { assuntosEstudados: null }, // Mini sessões sem assunto
          { 
            AND: [
              { assuntosEstudados: { not: null } }, // Com assunto
              { nomeSessao: { startsWith: 'Mini Sessão -' } } // Mas são mini sessões individuais
            ]
          }
        ]
      }
    })

    console.log('🔍 API - Sessões encontradas:', {
      solicitadas: sessaoIds.length,
      encontradas: sessoesExistentes.length,
      sessoesIds: sessoesExistentes.map(s => s.id)
    })

    if (sessoesExistentes.length !== sessaoIds.length) {
      const sessoesNaoEncontradas = sessaoIds.filter(id => 
        !sessoesExistentes.find(s => s.id === id)
      )
      
      console.log('❌ API - Sessões não encontradas:', sessoesNaoEncontradas)
      
      return NextResponse.json(
        { 
          error: 'Uma ou mais sessões não foram encontradas ou já estão associadas',
          detalhes: {
            solicitadas: sessaoIds.length,
            encontradas: sessoesExistentes.length,
            naoEncontradas: sessoesNaoEncontradas
          }
        },
        { status: 400 }
      )
    }

    // Atualizar todas as sessões selecionadas com os assuntos estudados
    const sessoesAtualizadas = await Promise.all(
      sessaoIds.map(sessaoId => {
        const sessaoExistente = sessoesExistentes.find(s => s.id === sessaoId)
        
        // Se a sessão já tem assuntos individuais, concatenar com os novos assuntos
        let assuntosFinais = assuntosEstudados.trim()
        if (sessaoExistente?.assuntosEstudados && sessaoExistente.nomeSessao?.startsWith('Mini Sessão -')) {
          const assuntosExistentes = sessaoExistente.assuntosEstudados
          const assuntosNovos = assuntosEstudados.trim()
          
          // Combinar assuntos únicos
          const todosAssuntos = [...new Set([assuntosExistentes, assuntosNovos])]
          assuntosFinais = todosAssuntos.join(', ')
        }
        
        return prisma.historicoLeitura.update({
          where: { id: sessaoId },
          data: {
            assuntosEstudados: assuntosFinais,
            nomeSessao: nomeSessao.trim()
          }
        })
      })
    )

    // Calcular estatísticas da sessão criada
    const totalTempo = sessoesExistentes.reduce((acc, sessao) => acc + sessao.tempoLeituraSegundos, 0)
    const totalMinutos = Math.round(totalTempo / 60)
    const paginasUnicas = new Set(sessoesExistentes.map(s => s.paginaAtual)).size
    const ultimaPagina = Math.max(...sessoesExistentes.map(s => s.paginaAtual))

    // Atualizar o progresso do material com a última página da sessão
    const materialAtualizado = await prisma.materialEstudo.update({
      where: { id: materialId },
      data: {
        paginasLidas: ultimaPagina
      }
    })

    console.log('✅ API - Sessão de estudo criada com sucesso:', {
      sessoesAtualizadas: sessoesAtualizadas.length,
      totalTempoMinutos: totalMinutos,
      paginasUnicas,
      ultimaPagina,
      materialAtualizado: {
        id: materialAtualizado.id,
        paginasLidas: materialAtualizado.paginasLidas
      }
    })

    return NextResponse.json({ 
      success: true, 
      sessaoCriada: {
        nome: nomeSessao || `Sessão de ${new Date().toLocaleDateString('pt-BR')}`,
        assuntosEstudados: assuntosEstudados.trim(),
        totalSessoes: sessoesAtualizadas.length,
        totalTempoMinutos: totalMinutos,
        totalTempoSegundos: totalTempo,
        paginasUnicas,
        ultimaPagina,
        sessoes: sessoesAtualizadas
      },
      material: {
        id: materialAtualizado.id,
        paginasLidas: materialAtualizado.paginasLidas,
        totalPaginas: materialAtualizado.totalPaginas
      },
      message: `Sessão de estudo criada com ${sessoesAtualizadas.length} mini sessões. Progresso atualizado para página ${ultimaPagina}.`
    })
  } catch (error) {
    console.error('❌ API - Erro ao criar sessão de estudo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar sessão de estudo' },
      { status: 500 }
    )
  }
} 