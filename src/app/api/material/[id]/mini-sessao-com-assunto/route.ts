import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

    const { paginaAtual, tempoLeituraMinutos, assunto } = await request.json()
    const { id } = await params
    const materialId = id

    console.log('📝 API - Criando mini sessão com assunto:', {
      materialId,
      paginaAtual,
      tempoLeituraMinutos,
      assunto,
      userId: session.user.id
    })

    if (!paginaAtual || paginaAtual <= 0) {
      return NextResponse.json(
        { error: 'Página atual é obrigatória e deve ser maior que 0' },
        { status: 400 }
      )
    }

    if (!assunto || assunto.trim() === '') {
      return NextResponse.json(
        { error: 'Assunto é obrigatório' },
        { status: 400 }
      )
    }

    if (tempoLeituraMinutos === undefined || tempoLeituraMinutos === null || tempoLeituraMinutos < 0) {
      return NextResponse.json(
        { error: 'Tempo de leitura deve ser maior ou igual a 0' },
        { status: 400 }
      )
    }

    // 2. Verificar se o material existe e pertence ao usuário
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      }
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    // Criar mini sessão com assunto
    const miniSessao = await prisma.historicoLeitura.create({
      data: {
        materialId: materialId,
        paginaAtual: paginaAtual,
        tempoLeituraSegundos: Math.round(tempoLeituraMinutos * 60),
        dataLeitura: new Date(),
        assuntosEstudados: assunto.trim(),
        nomeSessao: `Mini Sessão - ${assunto.trim()}`
      }
    })

    console.log('✅ API - Mini sessão criada com sucesso:', {
      miniSessao,
      material: {
        id: material.id,
        paginasLidas: material.paginasLidas,
        totalPaginas: material.totalPaginas
      }
    })

    return NextResponse.json({
      success: true,
      miniSessao,
      material: {
        id: material.id,
        paginasLidas: material.paginasLidas,
        totalPaginas: material.totalPaginas
      },
      message: `Mini sessão criada com assunto: ${assunto.trim()}. Use "Criar Sessão" para atualizar o progresso.`
    })

  } catch (error) {
    console.error('❌ API - Erro ao criar mini sessão com assunto:', error)
    return NextResponse.json(
      { error: 'Erro ao criar mini sessão com assunto' },
      { status: 500 }
    )
  }
} 