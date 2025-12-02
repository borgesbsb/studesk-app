import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: "Nome inválido" },
        { status: 400 }
      )
    }

    // Atualizar o perfil do usuário
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id
      },
      data: {
        name: name.trim()
      },
      select: {
        id: true,
        name: true,
        email: true,
        hash: true
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar perfil" },
      { status: 500 }
    )
  }
}
