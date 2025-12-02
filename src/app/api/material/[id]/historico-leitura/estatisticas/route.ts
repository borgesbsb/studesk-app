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

    // Data de hoje (início e fim do dia)
    const hoje = new Date()
    const inicioDodia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0)
    const fimDodia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59)

    console.log('📊 API - Buscando estatísticas do dia:', { materialId, inicioDodia, fimDodia, userId: session.user.id })

    // Buscar histórico de leitura do dia
    const historicoHoje = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        dataLeitura: {
          gte: inicioDodia,
          lte: fimDodia
        }
      },
      orderBy: {
        dataLeitura: 'asc'
      }
    })

    // Processar dados para o gráfico
    const dadosGrafico = historicoHoje.map((registro, index) => {
      const hora = registro.dataLeitura.getHours()
      const minuto = registro.dataLeitura.getMinutes()
      const tempoFormatado = `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`
      
      return {
        id: registro.id,
        hora: tempoFormatado,
        horaCompleta: registro.dataLeitura.toLocaleTimeString('pt-BR'),
        pagina: registro.paginaAtual,
        tempoSegundos: registro.tempoLeituraSegundos,
        tempoMinutos: Math.round(registro.tempoLeituraSegundos / 60 * 10) / 10, // 1 casa decimal
        sessao: index + 1
      }
    })

    // Calcular estatísticas do dia
    const totalSessoes = historicoHoje.length
    const totalTempoSegundos = historicoHoje.reduce((acc, curr) => acc + curr.tempoLeituraSegundos, 0)
    const totalMinutos = Math.round(totalTempoSegundos / 60)
    const paginasUnicas = new Set(historicoHoje.map(h => h.paginaAtual)).size
    
    // Página mais lida do dia
    const contagemPaginas = historicoHoje.reduce((acc, curr) => {
      acc[curr.paginaAtual] = (acc[curr.paginaAtual] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    const paginaMaisLida = Object.entries(contagemPaginas)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null

    const estatisticas = {
      totalSessoes,
      totalMinutos,
      totalSegundos: totalTempoSegundos,
      paginasUnicas,
      paginaMaisLida: paginaMaisLida ? parseInt(paginaMaisLida) : null,
      tempoMedioSessao: totalSessoes > 0 ? Math.round(totalTempoSegundos / totalSessoes / 60) : 0
    }

    console.log('✅ API - Estatísticas calculadas:', estatisticas)

    return NextResponse.json({ 
      success: true, 
      dados: dadosGrafico,
      estatisticas,
      message: `${totalSessoes} sessões encontradas para hoje`
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas de leitura' },
      { status: 500 }
    )
  }
} 