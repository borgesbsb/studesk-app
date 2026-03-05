import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/interface/actions/admin/auth"

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const planoId = searchParams.get('planoId')

  if (planoId) {
    // Retorna apenas as disciplinas do pool deste plano
    const pool = await prisma.planoEstudoDisciplina.findMany({
      where: { planoId },
      select: {
        disciplina: { select: { id: true, nome: true, cor: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
    return NextResponse.json(pool.map(p => p.disciplina))
  }

  // Sem filtro: retorna apenas disciplinas admin (userId: null)
  const disciplinas = await prisma.disciplina.findMany({
    where: { userId: null },
    select: { id: true, nome: true, cor: true },
    orderBy: { nome: 'asc' }
  })

  return NextResponse.json(disciplinas)
}
