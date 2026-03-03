import { NextRequest, NextResponse } from 'next/server'

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  const s = parseInt(match[3] || '0')
  return h * 3600 + m * 60 + s
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao acessar URL' }, { status: 502 })
    }

    const html = await res.text()

    let segundos: number | null = null
    let titulo: string | null = null

    // Duração: "lengthSeconds":"3600" — ytInitialPlayerResponse
    const lengthMatch = html.match(/"lengthSeconds":"(\d+)"/)
    if (lengthMatch) {
      segundos = parseInt(lengthMatch[1])
    } else {
      // fallback: <meta itemprop="duration" content="PT1H0M0S">
      const metaMatch = html.match(/<meta\s+itemprop="duration"\s+content="([^"]+)"/)
      if (metaMatch) {
        const s = parseIsoDuration(metaMatch[1])
        if (s > 0) segundos = s
      }
    }

    // Título: og:title é o mais limpo (sem " - YouTube")
    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)
    if (ogTitleMatch) {
      titulo = decodeHtmlEntities(ogTitleMatch[1])
    } else {
      // fallback: <title>Título - YouTube</title>
      const titleMatch = html.match(/<title>([^<]+)<\/title>/)
      if (titleMatch) {
        titulo = decodeHtmlEntities(
          titleMatch[1].replace(/\s*[-–|]\s*YouTube\s*$/i, '').trim()
        )
      }
    }

    if (!segundos && !titulo) {
      return NextResponse.json({ error: 'Metadados não encontrados' }, { status: 404 })
    }

    return NextResponse.json({ segundos, titulo })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
