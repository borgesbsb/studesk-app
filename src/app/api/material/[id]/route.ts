import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: any
) {
  // Aguarda a resolução dos parâmetros
  const resolvedParams = await Promise.resolve(params)
  const materialId = resolvedParams.id

  if (!materialId) {
    return NextResponse.json(
      { error: 'ID do material não fornecido' },
      { status: 400 }
    )
  }

  try {
    const material = await prisma.materialEstudo.findUnique({
      where: { id: materialId },
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