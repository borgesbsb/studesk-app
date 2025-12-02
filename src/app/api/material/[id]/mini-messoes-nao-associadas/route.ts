import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    console.log('📚 API - Buscando mini sessões não associadas:', { materialId, userId: session.user.id })

    // Buscar histórico de leitura que não tem assuntos estudados (não foi associado a uma sessão)
    const miniSessoes = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        assuntosEstudados: null // Apenas sessões que não foram associadas
      },
      orderBy: {
        dataLeitura: 'asc'
      },
      select: {
        id: true,
        paginaAtual: true,
        tempoLeituraSegundos: true,
        dataLeitura: true,
        createdAt: true
      }
    })

    console.log(`✅ API - ${miniSessoes.length} mini sessões não associadas encontradas`)

    // Agrupar por dia para mostrar estatísticas por dia
    const sessoesPorDia = new Map<string, {
      dataDia: string
      dataFormatada: string
      sessoes: typeof miniSessoes
      totalTempoSegundos: number
      totalTempoMinutos: number
      paginasUnicas: number
      totalSessoes: number
    }>()

    miniSessoes.forEach(sessao => {
      const dataDia = sessao.dataLeitura.toISOString().split('T')[0]
      const dataFormatada = new Date(sessao.dataLeitura).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

      if (!sessoesPorDia.has(dataDia)) {
        sessoesPorDia.set(dataDia, {
          dataDia,
          dataFormatada,
          sessoes: [],
          totalTempoSegundos: 0,
          totalTempoMinutos: 0,
          paginasUnicas: 0,
          totalSessoes: 0
        })
      }

      const dia = sessoesPorDia.get(dataDia)!
      dia.sessoes.push(sessao)
      dia.totalTempoSegundos += sessao.tempoLeituraSegundos
      dia.totalTempoMinutos = Math.round(dia.totalTempoSegundos / 60)
      dia.totalSessoes = dia.sessoes.length
    })

    // Calcular páginas únicas para cada dia
    sessoesPorDia.forEach(dia => {
      dia.paginasUnicas = new Set(dia.sessoes.map(s => s.paginaAtual)).size
    })

    // Calcular estatísticas gerais
    const totalTempo = miniSessoes.reduce((acc, sessao) => acc + sessao.tempoLeituraSegundos, 0)
    const totalMinutos = Math.round(totalTempo / 60)
    const paginasUnicas = new Set(miniSessoes.map(s => s.paginaAtual)).size

    const estatisticas = {
      totalMiniSessoes: miniSessoes.length,
      totalTempoMinutos: totalMinutos,
      totalTempoSegundos: totalTempo,
      paginasUnicas,
      periodoInicio: miniSessoes.length > 0 ? miniSessoes[0].dataLeitura : null,
      periodoFim: miniSessoes.length > 0 ? miniSessoes[miniSessoes.length - 1].dataLeitura : null,
      sessoesPorDia: Array.from(sessoesPorDia.values())
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
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { dataDia, assuntosEstudados } = await request.json()
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

    console.log('📝 API - Criando sessão de estudo para o dia:', {
      materialId,
      dataDia,
      assuntosEstudados,
      userId: session.user.id
    })

    if (!dataDia) {
      return NextResponse.json(
        { error: 'Data do dia é obrigatória' },
        { status: 400 }
      )
    }

    if (!assuntosEstudados || assuntosEstudados.trim() === '') {
      return NextResponse.json(
        { error: 'Assuntos estudados são obrigatórios' },
        { status: 400 }
      )
    }

    // Calcular início e fim do dia
    const dataInicio = new Date(dataDia + 'T00:00:00.000Z')
    const dataFim = new Date(dataDia + 'T23:59:59.999Z')

    // Buscar todas as mini sessões do dia que não têm assuntos estudados
    const sessoesDoDia = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        dataLeitura: {
          gte: dataInicio,
          lte: dataFim
        },
        assuntosEstudados: null // Apenas sessões não associadas
      }
    })

    if (sessoesDoDia.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma mini sessão encontrada para este dia ou todas já estão associadas' },
        { status: 400 }
      )
    }

    // Atualizar todas as sessões do dia com os assuntos estudados
    const sessoesAtualizadas = await Promise.all(
      sessoesDoDia.map(sessao =>
        prisma.historicoLeitura.update({
          where: { id: sessao.id },
          data: {
            assuntosEstudados: assuntosEstudados.trim()
          }
        })
      )
    )

    // Calcular estatísticas da sessão criada
    const totalTempo = sessoesDoDia.reduce((acc, sessao) => acc + sessao.tempoLeituraSegundos, 0)
    const totalMinutos = Math.round(totalTempo / 60)
    const paginasUnicas = new Set(sessoesDoDia.map(s => s.paginaAtual)).size
    const dataFormatada = new Date(dataDia).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    console.log('✅ API - Sessão de estudo criada com sucesso:', {
      sessoesAtualizadas: sessoesAtualizadas.length,
      totalTempoMinutos: totalMinutos,
      paginasUnicas,
      dataDia
    })

    return NextResponse.json({ 
      success: true, 
      sessaoCriada: {
        nome: `Sessão de Estudo - ${dataFormatada}`,
        assuntosEstudados: assuntosEstudados.trim(),
        totalSessoes: sessoesAtualizadas.length,
        totalTempoMinutos: totalMinutos,
        totalTempoSegundos: totalTempo,
        paginasUnicas,
        dataDia,
        dataFormatada,
        sessoes: sessoesAtualizadas
      },
      message: `Sessão de estudo criada para o dia ${dataFormatada} com ${sessoesAtualizadas.length} mini sessões`
    })
  } catch (error) {
    console.error('❌ API - Erro ao criar sessão de estudo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar sessão de estudo' },
      { status: 500 }
    )
  }
} 