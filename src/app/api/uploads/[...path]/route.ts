import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Não autorizado', { status: 401 })
    }

    // Aguardar os parâmetros
    const { path: pathSegments } = await params

    // O primeiro segmento do path deve ser o userId do dono do arquivo
    const fileOwnerId = pathSegments[0]

    // Verificar se o usuário está tentando acessar seus próprios arquivos
    if (fileOwnerId !== session.user.id) {
      return new NextResponse('Acesso negado', { status: 403 })
    }

    // Construir o caminho do arquivo
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments)

    // Verificar se o arquivo existe
    try {
      await fs.access(filePath)
    } catch {
      return new NextResponse('Arquivo não encontrado', { status: 404 })
    }

    // Ler o arquivo
    const fileBuffer = await fs.readFile(filePath)
    
    // Determinar o tipo MIME baseado na extensão
    const ext = path.extname(filePath).toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.txt':
        contentType = 'text/plain'
        break
      case '.json':
        contentType = 'application/json'
        break
      default:
        contentType = 'application/octet-stream'
    }

    // Retornar o arquivo com headers apropriados
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Erro ao servir arquivo estático:', error)
    return new NextResponse('Erro interno do servidor', { status: 500 })
  }
} 