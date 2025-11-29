import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const materialId = params.id

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
