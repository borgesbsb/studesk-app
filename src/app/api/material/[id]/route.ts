import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: handleCors(request) })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = handleCors(request)

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401, headers })
    }

    const { id } = await params

    const material = await prisma.materialEstudo.findFirst({
      where: {
        id,
        OR: [{ userId: session.user.id }, { userId: null }]
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
        arquivoPdfUrl: true,
        googleDriveFileId: true,
        totalPaginas: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!material) {
      return NextResponse.json({ error: 'Material não encontrado' }, { status: 404, headers })
    }

    return NextResponse.json(material, { headers })
  } catch (error) {
    console.error('Erro ao buscar material:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar material' },
      { status: 500, headers }
    )
  }
}
