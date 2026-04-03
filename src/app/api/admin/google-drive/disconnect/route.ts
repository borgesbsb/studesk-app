import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await prisma.admin.update({
    where: { id: session.id },
    data: { googleDriveAccessToken: null, googleDriveRefreshToken: null },
  })

  return NextResponse.json({ success: true })
}
