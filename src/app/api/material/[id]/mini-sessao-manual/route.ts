import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'ID do material é obrigatório' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { paginaAtual, tempoLeituraMinutos, dataLeitura } = body

    // Validações
    if (!paginaAtual || paginaAtual <= 0) {
      return NextResponse.json(
        { error: 'Página atual é obrigatória e deve ser maior que 0' },
        { status: 400 }
      )
    }

    if (!tempoLeituraMinutos || tempoLeituraMinutos <= 0) {
      return NextResponse.json(
        { error: 'Tempo de leitura é obrigatório e deve ser maior que 0' },
        { status: 400 }
      )
    }

    // Verificar se o material existe
    const materialExistente = await prisma.materialEstudo.findUnique({
      where: { id: materialId }
    })

    if (!materialExistente) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Converter minutos para segundos
    const tempoLeituraSegundos = Math.round(tempoLeituraMinutos * 60)

    // Usar a data fornecida ou a data atual
    const dataLeituraFinal = dataLeitura ? new Date(dataLeitura) : new Date()

    // Criar a mini sessão manual
    const miniSessao = await prisma.historicoLeitura.create({
      data: {
        materialId: materialId,
        paginaAtual: paginaAtual,
        tempoLeituraSegundos: tempoLeituraSegundos,
        dataLeitura: dataLeituraFinal,
        nomeSessao: null, // Mini sessão manual não tem nome de sessão
        assuntosEstudados: null // Mini sessão manual não tem assuntos estudados
      }
    })

    console.log('✅ Mini sessão manual criada:', {
      materialId,
      paginaAtual,
      tempoLeituraSegundos,
      dataLeitura: dataLeituraFinal
    })

    return NextResponse.json({
      success: true,
      message: 'Mini sessão manual criada com sucesso',
      miniSessao: {
        id: miniSessao.id,
        paginaAtual: miniSessao.paginaAtual,
        tempoLeituraSegundos: miniSessao.tempoLeituraSegundos,
        dataLeitura: miniSessao.dataLeitura
      }
    })

  } catch (error) {
    console.error('❌ Erro ao criar mini sessão manual:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 