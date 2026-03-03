import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const disciplinaId = searchParams.get('disciplinaId')

  if (!disciplinaId) {
    return NextResponse.json({ error: 'disciplinaId é obrigatório' }, { status: 400 })
  }

  try {
    const materiais = await prisma.materialEstudo.findMany({
      where: {
        userId: null,
        disciplinas: {
          some: { disciplinaId }
        }
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        totalPaginas: true,
        duracaoSegundos: true,
        arquivoPdfUrl: true,
        arquivoVideoUrl: true,
      },
      orderBy: { nome: 'asc' }
    })
    return NextResponse.json(materiais)
  } catch (error) {
    console.error('Erro ao buscar materiais da disciplina:', error)
    return NextResponse.json({ error: 'Erro ao buscar materiais' }, { status: 500 })
  }
}
