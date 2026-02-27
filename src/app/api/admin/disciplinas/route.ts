import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/interface/actions/admin/auth"

export async function GET() {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const disciplinas = await prisma.disciplina.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  return NextResponse.json(disciplinas)
}
