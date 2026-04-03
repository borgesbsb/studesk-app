import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs/promises'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAdminSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { id: editalId } = await params
    const edital = await prisma.edital.findUnique({ where: { id: editalId } })
    if (!edital) return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 })

    const formData = await req.formData()
    const file = (formData as any).get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    if (buffer.slice(0, 4).toString('latin1') !== '%PDF') {
      return NextResponse.json({ error: 'Arquivo não é um PDF válido' }, { status: 400 })
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'admin', 'editais')
    await fs.mkdir(dir, { recursive: true })

    const fileName = `${editalId}.pdf`
    const filePath = path.join(dir, fileName)
    await fs.writeFile(filePath, buffer)

    const pdfPath = `/uploads/admin/editais/${fileName}`
    await prisma.edital.update({ where: { id: editalId }, data: { pdfPath } })

    return NextResponse.json({ success: true, pdfPath })
  } catch (error: any) {
    console.error('[salvar-pdf] Erro:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao salvar PDF' }, { status: 500 })
  }
}
