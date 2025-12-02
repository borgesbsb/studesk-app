import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params
    const materialId = params.id

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

    // Buscar disciplinas associadas ao material
    const disciplinaMateriais = await prisma.disciplinaMaterial.findMany({
      where: {
        materialId
      },
      include: {
        disciplina: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    })

    const disciplinas = disciplinaMateriais.map(dm => dm.disciplina)

    return NextResponse.json(disciplinas)
  } catch (error) {
    console.error('Erro ao buscar disciplinas do material:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar disciplinas' },
      { status: 500 }
    )
  }
}
