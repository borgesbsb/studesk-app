import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params

    // Buscar a última sessão (último dia com registros)
    const ultimoRegistro = await prisma.historicoLeitura.findFirst({
      where: { materialId },
      orderBy: { dataLeitura: 'desc' }
    })

    if (!ultimoRegistro) {
      return NextResponse.json({ 
        success: true, 
        dadosUltimaSessao: [],
        estatisticas: {
          totalPaginasLidas: 0,
          tempoTotalMinutos: 0,
          paginaInicial: 0,
          paginaFinal: 0,
          dataUltimaSessao: null
        }
      })
    }

    // Calcular início do dia da última sessão
    const dataUltimaSessao = new Date(ultimoRegistro.dataLeitura)
    const inicioDia = new Date(dataUltimaSessao)
    inicioDia.setHours(0, 0, 0, 0)
    
    const fimDia = new Date(dataUltimaSessao)
    fimDia.setHours(23, 59, 59, 999)

    // Buscar todos os registros da última sessão
    const registrosUltimaSessao = await prisma.historicoLeitura.findMany({
      where: {
        materialId,
        dataLeitura: {
          gte: inicioDia,
          lte: fimDia
        }
      },
      orderBy: { dataLeitura: 'asc' }
    })

    // Processar dados para gráfico
    const dadosGrafico = registrosUltimaSessao.map((registro, index) => {
      const horario = new Date(registro.dataLeitura).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
      
      return {
        id: registro.id,
        ordem: index + 1,
        pagina: registro.paginaAtual,
        horario,
        tempoLeituraMinutos: Math.round(registro.tempoLeituraSegundos / 60),
        dataLeitura: registro.dataLeitura
      }
    })

    // Calcular estatísticas
    const paginaInicial = registrosUltimaSessao.length > 0 ? registrosUltimaSessao[0].paginaAtual : 0
    const paginaFinal = registrosUltimaSessao.length > 0 ? registrosUltimaSessao[registrosUltimaSessao.length - 1].paginaAtual : 0
    const totalPaginasLidas = Math.max(0, paginaFinal - paginaInicial + 1)
    const tempoTotalMinutos = registrosUltimaSessao.reduce((acc, reg) => acc + Math.round(reg.tempoLeituraSegundos / 60), 0)

    const estatisticas = {
      totalPaginasLidas,
      tempoTotalMinutos,
      paginaInicial,
      paginaFinal,
      dataUltimaSessao: dataUltimaSessao.toISOString(),
      totalRegistros: registrosUltimaSessao.length
    }

    return NextResponse.json({
      success: true,
      dadosUltimaSessao: dadosGrafico,
      estatisticas
    })

  } catch (error) {
    console.error('Erro ao buscar dados da última sessão:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 