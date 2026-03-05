import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// CORS helper function
function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = ['http://localhost:3031', 'http://localhost:3030']

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }

  if (allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(request),
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Não autorizado', {
        status: 401,
        headers: getCorsHeaders(request)
      })
    }

    // Aguardar os parâmetros
    const { path: pathSegments } = await params

    // O primeiro segmento do path deve ser o userId do dono do arquivo
    const fileOwnerId = pathSegments[0]

    // Arquivos admin (fileOwnerId === 'admin') são acessíveis por qualquer usuário autenticado
    if (fileOwnerId !== 'admin' && fileOwnerId !== session.user.id) {
      return new NextResponse('Acesso negado', {
        status: 403,
        headers: getCorsHeaders(request)
      })
    }

    // Construir o caminho do arquivo
    const filePath = path.join(process.cwd(), 'public', 'uploads', ...pathSegments)

    // Verificar se o arquivo existe
    try {
      await fs.access(filePath)
    } catch {
      return new NextResponse('Arquivo não encontrado', {
        status: 404,
        headers: getCorsHeaders(request)
      })
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
        ...getCorsHeaders(request),
      },
    })
  } catch (error) {
    console.error('Erro ao servir arquivo estático:', error)
    return new NextResponse('Erro interno do servidor', {
      status: 500,
      headers: getCorsHeaders(request)
    })
  }
} 