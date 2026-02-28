import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/interface/actions/admin/auth'
import path from 'path'
import pdfParse from 'pdf-parse'

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const formData = await request.formData()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = (formData as any).get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Apenas arquivos PDF são permitidos' }, { status: 400 })
    }

    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/\s+/g, '-')
    const fileName = `admin-${timestamp}-${sanitizedFileName}`

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'admin')
    const filePath = path.join(uploadsDir, fileName)

    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    let totalPaginas = 0
    try {
      const data = await pdfParse(buffer)
      totalPaginas = data.numpages
    } catch {
      // falha silenciosa — usuário pode preencher manualmente
    }

    const fileUrl = `/api/uploads/admin/${fileName}`

    return NextResponse.json({ success: true, fileUrl, totalPaginas })
  } catch (error) {
    console.error('Erro ao fazer upload admin:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }
}
