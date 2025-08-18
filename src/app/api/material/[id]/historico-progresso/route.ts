import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const materialId = id
    
    // Buscar dados dos últimos 30 dias
    const trinta_dias_atras = new Date()
    trinta_dias_atras.setDate(trinta_dias_atras.getDate() - 30)
    
    console.log('📊 API - Buscando histórico de progresso:', { materialId, desde: trinta_dias_atras })

    // Buscar histórico de leitura dos últimos 30 dias
    const historico = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        dataLeitura: {
          gte: trinta_dias_atras
        }
      },
      orderBy: {
        dataLeitura: 'asc'
      }
    })

    console.log(`📊 API - ${historico.length} registros encontrados`)

    // Agrupar por data e calcular páginas lidas por dia
    const dadosPorData = new Map<string, {
      data: string,
      dataFormatada: string,
      paginaMaxima: number,
      totalPaginasLidas: number,
      totalSessoes: number,
      totalTempoMinutos: number,
      registros: typeof historico
    }>()

    historico.forEach((registro) => {
      const dataString = registro.dataLeitura.toISOString().split('T')[0] // YYYY-MM-DD
      const dataFormatada = new Date(registro.dataLeitura).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      })

      if (!dadosPorData.has(dataString)) {
        dadosPorData.set(dataString, {
          data: dataString,
          dataFormatada,
          paginaMaxima: 0,
          totalPaginasLidas: 0,
          totalSessoes: 0,
          totalTempoMinutos: 0,
          registros: []
        })
      }

      const dadosDia = dadosPorData.get(dataString)!
      dadosDia.registros.push(registro)
      dadosDia.totalSessoes++
      dadosDia.totalTempoMinutos += Math.round(registro.tempoLeituraSegundos / 60)
      dadosDia.paginaMaxima = Math.max(dadosDia.paginaMaxima, registro.paginaAtual)
    })

    // Calcular páginas lidas por dia
    const dadosProcessados = Array.from(dadosPorData.values()).map((dadosDia) => {
      // Ordenar registros do dia por hora
      dadosDia.registros.sort((a, b) => a.dataLeitura.getTime() - b.dataLeitura.getTime())
      
      // Calcular páginas lidas no dia usando a mesma lógica do gráfico diário
      let paginasLidasDia = 0
      dadosDia.registros.forEach((registro, index) => {
        if (index === 0) {
          // Primeira sessão do dia: calcular com base no contexto geral
          // Se é o primeiro registro do material, usa a página atual
          // Senão, calcula diferença baseada no último registro anterior
          paginasLidasDia += registro.paginaAtual > 1 ? 1 : registro.paginaAtual
        } else {
          // Sessões seguintes: diferença entre página atual e anterior
          const paginaAnterior = dadosDia.registros[index - 1].paginaAtual
          const paginasLidas = Math.max(1, registro.paginaAtual - paginaAnterior)
          paginasLidasDia += paginasLidas
        }
      })

      return {
        data: dadosDia.data,
        dataFormatada: dadosDia.dataFormatada,
        paginaMaxima: dadosDia.paginaMaxima,
        paginasLidas: paginasLidasDia,
        sessoes: dadosDia.totalSessoes,
        tempoMinutos: dadosDia.totalTempoMinutos
      }
    })

    // Ordenar por data
    dadosProcessados.sort((a, b) => a.data.localeCompare(b.data))

    // Calcular estatísticas gerais
    const totalDias = dadosProcessados.length
    const totalPaginasLidas = dadosProcessados.reduce((acc, dia) => acc + dia.paginasLidas, 0)
    const totalSessoes = dadosProcessados.reduce((acc, dia) => acc + dia.sessoes, 0)
    const totalTempo = dadosProcessados.reduce((acc, dia) => acc + dia.tempoMinutos, 0)
    const paginaMaximaGeral = Math.max(...dadosProcessados.map(d => d.paginaMaxima), 0)

    const estatisticas = {
      totalDias,
      totalPaginasLidas,
      totalSessoes,
      totalTempo,
      paginaMaximaGeral,
      mediaPaginasPorDia: totalDias > 0 ? Math.round(totalPaginasLidas / totalDias) : 0,
      mediaTemposPorDia: totalDias > 0 ? Math.round(totalTempo / totalDias) : 0
    }

    console.log('✅ API - Histórico de progresso calculado:', { 
      totalDias, 
      totalPaginasLidas, 
      paginaMaximaGeral 
    })

    return NextResponse.json({ 
      success: true, 
      dados: dadosProcessados,
      estatisticas,
      message: `Histórico de ${totalDias} dias encontrado`
    })
  } catch (error) {
    console.error('❌ API - Erro ao buscar histórico de progresso:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar histórico de progresso' },
      { status: 500 }
    )
  }
} 