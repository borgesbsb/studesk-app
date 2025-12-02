import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  _request: Request,
  { params }: any
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

    // Aguarda a resolução dos parâmetros
    const resolvedParams = await Promise.resolve(params)
    const materialId = resolvedParams.id

    if (!materialId) {
      return NextResponse.json(
        { error: 'ID do material não fornecido' },
        { status: 400 }
      )
    }

    // 2. Buscar material e verificar ownership
    const material = await prisma.materialEstudo.findUnique({
      where: {
        id: materialId,
        userId: session.user.id
      },
      select: {
        id: true,
        nome: true,
        arquivoPdfUrl: true,
        totalPaginas: true,
        paginasLidas: true,
        createdAt: true,
        updatedAt: true,
        disciplinas: {
          select: {
            disciplina: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
        },
      },
    })

    if (!material) {
      return NextResponse.json(
        { error: 'Material não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ material })
  } catch (error) {
    console.error('Erro ao buscar material:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar material' },
      { status: 500 }
    )
  }
} 