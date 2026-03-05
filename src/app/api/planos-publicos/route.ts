import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/planos-publicos
 * Retorna planos admin (userId=null, ativo=true) para exibição na tela de registro.
 * Não requer autenticação.
 */
export async function GET() {
  try {
    const planos = await prisma.planoEstudo.findMany({
      where: { userId: null, ativo: true },
      select: { id: true, nome: true, descricao: true },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(planos)
  } catch (error) {
    console.error('Erro ao listar planos públicos:', error)
    return NextResponse.json({ error: 'Erro ao listar planos' }, { status: 500 })
  }
}
