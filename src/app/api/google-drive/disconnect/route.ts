import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth()

    // Limpar tokens do Google Drive do usuário
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleDriveAccessToken: null,
        googleDriveRefreshToken: null,
      },
    })

    return NextResponse.json({ success: true }, { headers: handleCors(request) })
  } catch (error) {
    console.error('Erro ao desconectar Google Drive:', error)
    return NextResponse.json(
      { error: 'Falha ao desconectar Google Drive' },
      { status: 500, headers: handleCors(request) }
    )
  }
}
