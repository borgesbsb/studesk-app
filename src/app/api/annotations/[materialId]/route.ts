import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

interface RouteParams {
  params: {
    materialId: string
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const headers = handleCors(request)
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // }

    const { materialId } = await params

    if (!materialId) {
      return NextResponse.json(
        { error: 'materialId é obrigatório' },
        { status: 400, headers }
      )
    }

    // Verificar se material pertence ao usuário (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        // userId: session.user.id,  // COMENTADO PARA POC
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers }
      )
    }

    // Buscar anotações do mobile reader (com startOffset/endOffset OU freehand)
    const anotacoes = await prisma.anotacao.findMany({
      where: {
        materialId,
        OR: [
          // Anotações de texto (highlight, underline, strikethrough)
          {
            startOffset: { not: null },
            endOffset: { not: null },
          },
          // Desenhos à mão livre
          {
            tipo: 'freehand',
          },
        ],
      },
      orderBy: {
        createdAt: 'asc', // Ordenar por data de criação
      },
    })

    return NextResponse.json({
      success: true,
      count: anotacoes.length,
      data: anotacoes.map((a) => ({
        id: a.id,
        materialId: a.materialId,
        texto: a.texto,
        startOffset: a.startOffset,
        endOffset: a.endOffset,
        cor: a.cor,
        tipo: a.tipo,
        pagina: a.pagina, // Incluir número da página (usado em freehand)
        metadata: a.metadata, // Incluir metadata (paths para freehand)
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    }, { headers })
  } catch (error) {
    console.error('Erro ao buscar anotações:', error)
    return NextResponse.json(
      {
        error: 'Erro ao buscar anotações',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500, headers }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const headers = handleCors(request)
  try {
    // Autenticação DESABILITADA TEMPORARIAMENTE PARA POC
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    // }

    const { materialId } = await params
    const { searchParams } = new URL(request.url)
    const annotationId = searchParams.get('id')

    if (!annotationId) {
      return NextResponse.json(
        { error: 'ID da anotação é obrigatório' },
        { status: 400, headers }
      )
    }

    // Verificar se material pertence ao usuário (SEM verificação de userId para POC)
    const material = await prisma.materialEstudo.findFirst({
      where: {
        id: materialId,
        // userId: session.user.id,  // COMENTADO PARA POC
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404, headers }
      )
    }

    // Verificar se anotação existe e pertence a este material
    const anotacao = await prisma.anotacao.findFirst({
      where: {
        id: annotationId,
        materialId,
      },
    })

    if (!anotacao) {
      return NextResponse.json(
        { error: 'Anotação não encontrada' },
        { status: 404, headers }
      )
    }

    // Deletar anotação
    await prisma.anotacao.delete({
      where: { id: annotationId },
    })

    return NextResponse.json({
      success: true,
      message: 'Anotação removida com sucesso',
    }, { headers })
  } catch (error) {
    console.error('Erro ao deletar anotação:', error)
    return NextResponse.json(
      {
        error: 'Erro ao deletar anotação',
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500, headers }
    )
  }
}
