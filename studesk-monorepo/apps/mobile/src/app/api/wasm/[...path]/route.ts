import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { handleCors } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200, headers: handleCors(request) })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params
    const filePath = join(process.cwd(), 'public', ...path)

    const fileBuffer = await readFile(filePath)

    // Determinar o Content-Type baseado na extensão
    const fileName = path[path.length - 1]
    let contentType = 'application/octet-stream'

    if (fileName.endsWith('.wasm')) {
      contentType = 'application/wasm'
    } else if (fileName.endsWith('.js')) {
      contentType = 'application/javascript'
    }

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Erro ao servir arquivo WASM:', error)
    return new NextResponse('File not found', { status: 404 })
  }
}
