import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const THUMB_DIR = path.join(process.cwd(), 'public', 'thumbnails')

/**
 * Serve thumbnail em cache. A geração acontece no endpoint de download do vídeo.
 * Se a thumbnail ainda não existe, retorna 404 (o vídeo ainda não foi baixado).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const { materialId } = await params
  const thumbPath = path.join(THUMB_DIR, `${materialId}.jpg`)

  if (!fs.existsSync(thumbPath)) {
    return NextResponse.json(
      { error: 'Thumbnail ainda não disponível. Baixe o vídeo primeiro.' },
      { status: 404 }
    )
  }

  const thumbBuffer = fs.readFileSync(thumbPath)
  return new NextResponse(thumbBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=2592000',
    },
  })
}
