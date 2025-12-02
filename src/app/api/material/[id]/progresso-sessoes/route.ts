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

    console.log('📊 API - Calculando progresso baseado nas sessões:', { materialId, userId: session.user.id })

    // 3. Buscar todas as sessões de estudo (excluindo mini sessões individuais)
    const sessoesEstudo = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        AND: [
          { nomeSessao: { not: null } },
          { nomeSessao: { not: { startsWith: 'Mini Sessão -' } } }, // Excluir mini sessões individuais
          { assuntosEstudados: { not: null } }
        ]
      },
      select: {
        paginaAtual: true,
        nomeSessao: true,
        dataLeitura: true,
      }
    })

    // Se não há sessões, retornar progresso 0
    if (sessoesEstudo.length === 0) {
      return NextResponse.json({
        success: true,
        progresso: {
          paginasLidas: 0,
          ultimaPagina: 0,
          totalSessoes: 0,
          ultimaSessao: null
        },
        message: 'Nenhuma sessão encontrada - progresso zerado'
      })
    }

    // 2. Agrupar por sessão e calcular estatísticas
    const sessoesAgrupadas = new Map<string, number[]>()
    
    sessoesEstudo.forEach(sessao => {
      const nomeSessao = sessao.nomeSessao!
      if (!sessoesAgrupadas.has(nomeSessao)) {
        sessoesAgrupadas.set(nomeSessao, [])
      }
      sessoesAgrupadas.get(nomeSessao)!.push(sessao.paginaAtual)
    })

    // 3. Calcular a última página lida entre todas as sessões
    const todasPaginas = sessoesEstudo.map(s => s.paginaAtual)
    const ultimaPagina = Math.max(...todasPaginas)
    
    // 4. Calcular páginas únicas (sem duplicatas)
    const paginasUnicas = [...new Set(todasPaginas)].sort((a, b) => a - b)

    // O progresso real é a última página lida
    const progressoReal = ultimaPagina

    console.log('✅ API - Progresso calculado das sessões:', {
      materialId,
      progressoReal,
      ultimaPagina,
      totalSessoes: sessoesAgrupadas.size,
      paginasUnicas: paginasUnicas.length
    })

    return NextResponse.json({
      success: true,
      progresso: {
        paginasLidas: progressoReal,
        ultimaPagina: ultimaPagina,
        totalSessoes: sessoesAgrupadas.size,
        ultimaSessao: {
          nome: sessoesEstudo[0]?.nomeSessao || null,
          data: sessoesEstudo[0]?.dataLeitura || null,
          paginas: paginasUnicas,
          ultimaPagina: ultimaPagina
        }
      },
      message: `Progresso calculado: ${progressoReal} páginas (última página lida)`
    })

  } catch (error) {
    console.error('❌ API - Erro ao calcular progresso das sessões:', error)
    return NextResponse.json(
      { error: 'Erro ao calcular progresso das sessões' },
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

    console.log('📝 API - Atualizando progresso baseado nas sessões:', { materialId, userId: session.user.id })

    // 3. Calcular o progresso atual com base nas sessões
    const sessoesEstudo = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        AND: [
          { nomeSessao: { not: null } },
          { nomeSessao: { not: { startsWith: 'Mini Sessão -' } } }, // Excluir mini sessões individuais
          { assuntosEstudados: { not: null } }
        ]
      },
      select: {
        paginaAtual: true,
        nomeSessao: true,
        dataLeitura: true,
      }
    })

    // Se não há sessões, definir progresso como 0
    let progressoReal = 0
    let ultimaPagina = 0
    let todasPaginas: number[] = []

    if (sessoesEstudo.length > 0) {
      todasPaginas = sessoesEstudo.map(s => s.paginaAtual)
      ultimaPagina = Math.max(...todasPaginas)
      progressoReal = ultimaPagina
    }

    // Atualizar o material com o progresso calculado das sessões
    const materialAtualizado = await prisma.materialEstudo.update({
      where: { id: materialId },
      data: {
        paginasLidas: progressoReal,
        updatedAt: new Date()
      },
      select: {
        id: true,
        nome: true,
        totalPaginas: true,
        paginasLidas: true,
        updatedAt: true
      }
    })

    console.log('✅ API - Material atualizado com progresso das sessões:', {
      materialId,
      progressoReal,
      ultimaPagina,
      totalSessoes: sessoesEstudo.length
    })

    return NextResponse.json({
      success: true,
      material: materialAtualizado,
      progresso: {
        paginasLidas: progressoReal,
        ultimaPagina: ultimaPagina,
        totalSessoes: sessoesEstudo.length,
        ultimaSessao: sessoesEstudo.length > 0 ? {
          nome: sessoesEstudo[0]?.nomeSessao || null,
          data: sessoesEstudo[0]?.dataLeitura || null,
          paginas: todasPaginas.sort((a, b) => a - b),
          ultimaPagina: ultimaPagina
        } : null
      },
      message: sessoesEstudo.length > 0 
        ? `Progresso atualizado para ${progressoReal} páginas baseado nas sessões`
        : `Progresso zerado - nenhuma sessão encontrada`
    })

  } catch (error) {
    console.error('❌ API - Erro ao atualizar progresso das sessões:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar progresso das sessões' },
      { status: 500 }
    )
  }
} 