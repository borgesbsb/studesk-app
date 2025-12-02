import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const materialId = id

    // 2. Verificar ownership do material
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
        { status: 404 }
      )
    }

    console.log('📚 API - Buscando sessões de estudo:', { materialId, userId: session.user.id })

    // Buscar apenas sessões que foram associadas a uma sessão de estudo (têm nomeSessao e assuntosEstudados)
    const sessoesEstudo = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        nomeSessao: { not: null },
        assuntosEstudados: { not: null }
      },
      orderBy: {
        dataLeitura: 'desc'
      },
      select: {
        id: true,
        paginaAtual: true,
        tempoLeituraSegundos: true,
        assuntosEstudados: true,
        nomeSessao: true,
        dataLeitura: true,
        createdAt: true
      }
    })

    console.log(`✅ API - ${sessoesEstudo.length} sessões de estudo encontradas`)

    // Agrupar por nome da sessão (cada grupo é uma sessão de estudo)
    const sessoesAgrupadas = new Map<string, {
      nomeSessao: string
      assuntosEstudados: string
      sessoes: typeof sessoesEstudo
      totalTempoSegundos: number
      totalTempoMinutos: number
      paginasUnicas: number
      periodoInicio: Date
      periodoFim: Date
      totalSessoes: number
    }>()

    sessoesEstudo.forEach(sessao => {
      // Agora todas as sessões já têm nomeSessao e assuntosEstudados
      const nomeSessao = sessao.nomeSessao!
      const assuntos = sessao.assuntosEstudados!
      
      if (!sessoesAgrupadas.has(nomeSessao)) {
        sessoesAgrupadas.set(nomeSessao, {
          nomeSessao: nomeSessao,
          assuntosEstudados: assuntos,
          sessoes: [],
          totalTempoSegundos: 0,
          totalTempoMinutos: 0,
          paginasUnicas: 0,
          periodoInicio: sessao.dataLeitura,
          periodoFim: sessao.dataLeitura,
          totalSessoes: 0
        })
      }

      const grupo = sessoesAgrupadas.get(nomeSessao)!
      grupo.sessoes.push(sessao)
      grupo.totalTempoSegundos += sessao.tempoLeituraSegundos
      grupo.totalTempoMinutos = Math.round(grupo.totalTempoSegundos / 60)
      grupo.totalSessoes = grupo.sessoes.length
      
      if (sessao.dataLeitura < grupo.periodoInicio) {
        grupo.periodoInicio = sessao.dataLeitura
      }
      if (sessao.dataLeitura > grupo.periodoFim) {
        grupo.periodoFim = sessao.dataLeitura
      }
    })

    // Calcular páginas únicas para cada grupo
    sessoesAgrupadas.forEach(grupo => {
      grupo.paginasUnicas = new Set(grupo.sessoes.map(s => s.paginaAtual)).size
    })

    const sessoesProcessadas = Array.from(sessoesAgrupadas.values()).map(grupo => {
      // Ordenar páginas para mostrar em ordem
      const paginasOrdenadas = grupo.sessoes
        .map(s => s.paginaAtual)
        .sort((a, b) => a - b)
      
      // Formatar páginas como string (ex: "1, 2, 5, 10")
      const paginasFormatadas = paginasOrdenadas.join(', ')
      
      return {
        id: grupo.nomeSessao, // Usar nomeSessao como ID único
        nome: grupo.nomeSessao,
        assuntosEstudados: grupo.assuntosEstudados,
        totalSessoes: grupo.totalSessoes,
        totalTempoMinutos: grupo.totalTempoMinutos,
        totalTempoSegundos: grupo.totalTempoSegundos,
        paginasUnicas: grupo.paginasUnicas,
        paginasLidas: paginasFormatadas, // Páginas específicas lidas
        periodoInicio: grupo.periodoInicio,
        periodoFim: grupo.periodoFim,
        sessoes: grupo.sessoes
      }
    })

    // Ordenar por data mais recente
    sessoesProcessadas.sort((a, b) => b.periodoFim.getTime() - a.periodoFim.getTime())

    // Calcular estatísticas gerais
    const totalSessoes = sessoesProcessadas.length
    const totalTempo = sessoesProcessadas.reduce((acc, sessao) => acc + sessao.totalTempoMinutos, 0)
    const totalMiniSessoes = sessoesProcessadas.reduce((acc, sessao) => acc + sessao.totalSessoes, 0)

    const estatisticas = {
      totalSessoesEstudo: totalSessoes,
      totalTempoMinutos: totalTempo,
      totalMiniSessoes: totalMiniSessoes,
      mediaTempoPorSessao: totalSessoes > 0 ? Math.round(totalTempo / totalSessoes) : 0
    }

    return NextResponse.json({ 
      success: true, 
      sessoesEstudo: sessoesProcessadas,
      estatisticas,
      message: `${sessoesProcessadas.length} sessões de estudo encontradas`
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar sessões de estudo:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar sessões de estudo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { nomeSessao } = await request.json()
    const { id } = await params
    const materialId = id

    // 2. Verificar ownership do material
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
        { status: 404 }
      )
    }

    console.log('🗑️ API - Excluindo sessão de estudo:', {
      materialId,
      nomeSessao,
      userId: session.user.id
    })

    if (!nomeSessao || nomeSessao.trim() === '') {
      return NextResponse.json(
        { error: 'Nome da sessão é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar todas as sessões com o nome especificado
    const sessoesParaDesassociar = await prisma.historicoLeitura.findMany({
      where: {
        materialId: materialId,
        nomeSessao: nomeSessao.trim()
      }
    })

    if (sessoesParaDesassociar.length === 0) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      )
    }

    // Desassociar as mini sessões (definir assuntosEstudados e nomeSessao como null)
    const sessoesDesassociadas = await Promise.all(
      sessoesParaDesassociar.map(sessao =>
        prisma.historicoLeitura.update({
          where: { id: sessao.id },
          data: {
            assuntosEstudados: null,
            nomeSessao: null
          }
        })
      )
    )

    console.log('✅ API - Sessão de estudo excluída com sucesso:', {
      sessoesDesassociadas: sessoesDesassociadas.length,
      nomeSessao: nomeSessao
    })

    return NextResponse.json({ 
      success: true, 
      message: `Sessão "${nomeSessao}" excluída com sucesso. ${sessoesDesassociadas.length} mini sessões foram desassociadas.`
    })
  } catch (error) {
    console.error('❌ API - Erro ao excluir sessão de estudo:', error)
    return NextResponse.json(
      { error: 'Erro ao excluir sessão de estudo' },
      { status: 500 }
    )
  }
} 