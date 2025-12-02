import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: materialId } = await params

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

    const anotacoes = await prisma.anotacao.findMany({
      where: {
        materialId
      },
      orderBy: [
        { pagina: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(anotacoes)
  } catch (error) {
    console.error('Erro ao buscar anotações:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: materialId } = await params

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

    const body = await request.json()

    // Se está salvando múltiplas anotações
    if (Array.isArray(body)) {
      // Remove todas as anotações existentes do material
      await prisma.anotacao.deleteMany({
        where: { materialId }
      })

      // Cria as novas anotações
      const anotacoes = await prisma.anotacao.createMany({
        data: body.map((anotacao: any) => ({
          materialId,
          pagina: anotacao.pagina,
          texto: anotacao.texto,
          posicaoX: anotacao.posicaoX,
          posicaoY: anotacao.posicaoY,
          largura: anotacao.largura,
          altura: anotacao.altura,
          cor: anotacao.cor || '#ffff00',
          tipo: anotacao.tipo || 'highlight'
        }))
      })

      return NextResponse.json({ success: true, count: anotacoes.count })
    }

    // Se está salvando uma única anotação
    const anotacao = await prisma.anotacao.create({
      data: {
        materialId,
        pagina: body.pagina,
        texto: body.texto,
        posicaoX: body.posicaoX,
        posicaoY: body.posicaoY,
        largura: body.largura,
        altura: body.altura,
        cor: body.cor || '#ffff00',
        tipo: body.tipo || 'highlight'
      }
    })

    return NextResponse.json(anotacao)
  } catch (error) {
    console.error('Erro ao salvar anotação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { id: materialId } = await params

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

    const { searchParams } = new URL(request.url)
    const anotacaoId = searchParams.get('anotacaoId')

    if (anotacaoId) {
      // Remove uma anotação específica
      await prisma.anotacao.delete({
        where: {
          id: anotacaoId,
          materialId // Garante que só pode deletar anotações do próprio material
        }
      })
    } else {
      // Remove todas as anotações do material
      await prisma.anotacao.deleteMany({
        where: { materialId }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar anotação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 