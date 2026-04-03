/**
 * Utilitários de extração de texto de PDF para o servidor.
 *
 * extractPageRange(buffer, inicio, fim)
 *   Extrai texto das páginas especificadas usando pdfjs-dist.
 *   Usado no Passo 2 da extração de editais (conteúdo por disciplina).
 */

/**
 * Extrai texto de um intervalo de páginas do PDF.
 * Retorna o texto concatenado das páginas inicio..fim (1-indexed).
 */
export async function extractPageRange(
  buffer: Buffer,
  inicio: number,
  fim: number
): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js')
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    verbosity: 0,
    disableRange: true,
    disableStream: true,
    useSystemFonts: true,
  }).promise

  const start = Math.max(1, inicio)
  const end   = Math.min(pdf.numPages, fim)

  const paginas: string[] = []

  for (let pageNum = start; pageNum <= end; pageNum++) {
    const page    = await pdf.getPage(pageNum)
    const content = await page.getTextContent()

    const texto = content.items
      .filter((item: any) => 'str' in item && item.str?.trim())
      .map((item: any) => item.str)
      .join(' ')

    if (texto.trim()) paginas.push(texto.trim())
  }

  return paginas.join('\n').replace(/\s{3,}/g, ' ').trim()
}
