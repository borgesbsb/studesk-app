/**
 * Extração de texto de PDF com awareness de posição.
 * Usa pdfjs-dist diretamente para obter coordenadas x/y de cada chunk de texto,
 * reconstruindo a ordem de leitura corretamente (múltiplas colunas, tabelas).
 *
 * Fallback para pdf-parse em caso de erro.
 */

interface TextChunk {
  str: string
  x: number
  y: number
  width: number
  fontSize: number
  page: number
}

/**
 * Extrai texto de um PDF com reconstrução baseada em posição.
 * Resolve mistura de colunas que o pdf-parse produz em editais com layout complexo.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')

    // Sem worker no contexto Node.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableRange: true,
      disableStream: true,
      verbosity: 0,
    })

    const pdf = await loadingTask.promise
    const chunks: TextChunk[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const textContent = await page.getTextContent()

      for (const item of textContent.items) {
        if (!('str' in item) || !item.str?.trim()) continue

        const x = item.transform[4]
        // Converte y de bottom-up (PDF) para top-down
        const y = viewport.height - item.transform[5]
        const fontSize = Math.abs(item.transform[3]) || 10

        chunks.push({
          str: item.str,
          x: Math.round(x),
          y: Math.round(y),
          width: item.width || 0,
          fontSize: Math.round(fontSize),
          page: pageNum,
        })
      }
    }

    if (chunks.length < 20) {
      throw new Error('Poucos chunks extraídos — possível PDF baseado em imagem')
    }

    return reconstructText(chunks)
  } catch (err) {
    console.warn('[pdf-extract] pdfjs-dist falhou, usando pdf-parse como fallback:', (err as Error)?.message)
    const pdfParse = (await import('pdf-parse')).default
    const data = await pdfParse(buffer)
    return data.text || ''
  }
}

// ---------------------------------------------------------------------------
// Reconstrução de texto por posição
// ---------------------------------------------------------------------------

function reconstructText(chunks: TextChunk[]): string {
  // Agrupar por página
  const byPage = new Map<number, TextChunk[]>()
  for (const chunk of chunks) {
    const arr = byPage.get(chunk.page) ?? []
    arr.push(chunk)
    byPage.set(chunk.page, arr)
  }

  const pages: string[] = []
  for (const [, pageChunks] of [...byPage.entries()].sort((a, b) => a[0] - b[0])) {
    pages.push(reconstructPage(pageChunks))
  }

  return pages.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function reconstructPage(chunks: TextChunk[]): string {
  if (chunks.length === 0) return ''

  // Ordenar top-down, left-right
  const sorted = [...chunks].sort((a, b) => {
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 4) return yDiff
    return a.x - b.x
  })

  // Agrupar em linhas (y próximos)
  const lines: TextChunk[][] = []
  let current: TextChunk[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (Math.abs(curr.y - prev.y) > 4) {
      lines.push(current)
      current = [curr]
    } else {
      current.push(curr)
    }
  }
  if (current.length > 0) lines.push(current)

  return lines
    .map(line => {
      line.sort((a, b) => a.x - b.x)
      let text = ''
      for (let i = 0; i < line.length; i++) {
        if (i === 0) {
          text = line[i].str
        } else {
          const prev = line[i - 1]
          const gap = line[i].x - (prev.x + prev.width)
          // Gap > metade do fontSize = novo token/palavra
          text += gap > prev.fontSize * 0.4 ? ' ' + line[i].str : line[i].str
        }
      }
      return text.trim()
    })
    .filter(Boolean)
    .join('\n')
}

// ---------------------------------------------------------------------------
// Localização de seção por âncora (substitui busca por keywords fixas)
// ---------------------------------------------------------------------------

const MARCADORES_FALLBACK = [
  'CONTEÚDO PROGRAMÁTICO', 'CONTEUDO PROGRAMÁTICO',
  'CONTEÚDO PROGRAMATICO', 'CONTEUDO PROGRAMATICO',
  'PROGRAMA DE PROVAS', 'CONHECIMENTOS ESPECÍFICOS',
  'CONHECIMENTOS ESPECIFICOS', 'CONHECIMENTOS GERAIS',
  'MATÉRIAS EXIGIDAS', 'MATERIAS EXIGIDAS',
  'DISCIPLINAS EXIGIDAS', 'PROGRAMA DAS PROVAS',
  'COMPONENTES CURRICULARES',
]

/**
 * Localiza a seção de conteúdo programático usando:
 * 1. âncora fornecida pelo Claude no passo anterior (busca normalizada)
 * 2. fallback: última ocorrência de palavras-chave conhecidas
 * 3. último fallback: início do documento
 */
export function localizarSecaoPorAncora(
  texto: string,
  ancora?: string | null,
  maxChars = 60000
): { secao: string; metodo: string } {
  if (ancora && ancora.trim().length > 10) {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\sÀ-ÿ]/g, '').trim()
    const textoNorm = norm(texto)
    const ancoraFrags = norm(ancora).slice(0, 120).split(' ').filter(w => w.length > 4)

    // Tenta match das primeiras palavras significativas da âncora
    for (let take = ancoraFrags.length; take >= 3; take--) {
      const trecho = ancoraFrags.slice(0, take).join(' ')
      const idx = textoNorm.indexOf(trecho)
      if (idx !== -1) {
        // Mapeia de volta ao índice no texto original (aproximado)
        const ratio = idx / textoNorm.length
        const idxOrig = Math.round(ratio * texto.length)
        console.log(`[localizarSecao] âncora encontrada (${take} palavras) em ~${idxOrig}`)
        return { secao: texto.slice(idxOrig, idxOrig + maxChars), metodo: 'ancora' }
      }
    }
    console.warn('[localizarSecao] âncora não encontrada no texto, usando fallback keyword')
  }

  // Fallback: última ocorrência de keyword conhecida
  const textoUpper = texto.toUpperCase()
  for (const marcador of MARCADORES_FALLBACK) {
    const idx = textoUpper.lastIndexOf(marcador)
    if (idx !== -1) {
      console.log(`[localizarSecao] keyword "${marcador}" em offset ${idx}`)
      return { secao: texto.slice(idx, idx + maxChars), metodo: 'keyword' }
    }
  }

  console.log('[localizarSecao] sem marcador — usando início do documento')
  return { secao: texto.slice(0, maxChars), metodo: 'inicio' }
}
