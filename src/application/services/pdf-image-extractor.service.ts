import * as pdfjsLib from 'pdfjs-dist'
import fs from 'fs/promises'
import path from 'path'
import { createCanvas, Image as CanvasImage } from 'canvas'

// Configurar worker do pdfjs
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

export interface ExtractedImage {
  pageNumber: number
  imageIndex: number
  yPosition: number
  width: number
  height: number
  imageUrl: string
  imageBuffer: Buffer
}

export class PdfImageExtractorService {
  /**
   * Extrai todas as imagens de um PDF
   */
  async extractImages(
    pdfPath: string,
    materialId: string,
    userId: string,
    startPage?: number,
    endPage?: number
  ): Promise<ExtractedImage[]> {
    const extractedImages: ExtractedImage[] = []

    try {
      // Carregar PDF
      const data = await fs.readFile(pdfPath)
      const loadingTask = pdfjsLib.getDocument({ data })
      const pdfDocument = await loadingTask.promise

      const numPages = pdfDocument.numPages
      const start = startPage || 1
      const end = endPage || numPages

      console.log(`🖼️  Extraindo imagens das páginas ${start} a ${end}...`)

      // Criar diretório para salvar imagens
      const imagesDir = path.join(
        process.cwd(),
        'public',
        'uploads',
        userId,
        'images',
        materialId
      )
      await fs.mkdir(imagesDir, { recursive: true })

      // Processar cada página
      for (let pageNum = start; pageNum <= end; pageNum++) {
        const page = await pdfDocument.getPage(pageNum)
        const operatorList = await page.getOperatorList()

        let imageIndex = 0

        // Procurar por operadores de imagem
        for (let i = 0; i < operatorList.fnArray.length; i++) {
          const fn = operatorList.fnArray[i]
          const args = operatorList.argsArray[i]

          // OPS.paintImageXObject = 85 (imagem)
          // OPS.paintInlineImageXObject = 86 (imagem inline)
          if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
            try {
              const imageName = args[0]

              // Obter recursos da página
              const resources = await page.objs.get(imageName)

              if (resources) {
                // Extrair dados da imagem
                const { width, height, data: imageData } = resources

                if (width && height && imageData) {
                  // Criar canvas para converter imageData em PNG
                  const canvas = createCanvas(width, height)
                  const ctx = canvas.getContext('2d')

                  // Criar ImageData
                  const imgData = ctx.createImageData(width, height)
                  imgData.data.set(imageData)
                  ctx.putImageData(imgData, 0, 0)

                  // Converter para buffer PNG
                  const imageBuffer = canvas.toBuffer('image/png')

                  // Salvar imagem
                  const filename = `page-${pageNum}-img-${imageIndex}.png`
                  const imagePath = path.join(imagesDir, filename)
                  await fs.writeFile(imagePath, imageBuffer)

                  // URL pública da imagem
                  const imageUrl = `/uploads/${userId}/images/${materialId}/${filename}`

                  // Estimar posição Y (aproximado, pode precisar ajuste)
                  const viewport = page.getViewport({ scale: 1.0 })
                  const yPosition = viewport.height * 0.5 // Posição aproximada no meio

                  extractedImages.push({
                    pageNumber: pageNum,
                    imageIndex,
                    yPosition,
                    width,
                    height,
                    imageUrl,
                    imageBuffer,
                  })

                  console.log(`   ✅ Imagem extraída: ${filename} (${width}x${height})`)
                  imageIndex++
                }
              }
            } catch (imgError) {
              console.error(`   ⚠️  Erro ao extrair imagem na página ${pageNum}:`, imgError)
            }
          }
        }

        if (imageIndex > 0) {
          console.log(`📄 Página ${pageNum}: ${imageIndex} imagem(ns) extraída(s)`)
        }
      }

      console.log(`✅ Total: ${extractedImages.length} imagens extraídas`)
      return extractedImages
    } catch (error) {
      console.error('❌ Erro ao extrair imagens do PDF:', error)
      throw error
    }
  }

  /**
   * Insere marcadores de imagem no texto baseado na posição Y
   */
  insertImageMarkers(
    text: string,
    pageNumber: number,
    images: ExtractedImage[]
  ): string {
    // Filtrar imagens desta página
    const pageImages = images.filter(img => img.pageNumber === pageNumber)

    if (pageImages.length === 0) {
      return text
    }

    // Por simplicidade, vamos adicionar imagens no final da página por enquanto
    // TODO: Melhorar para inserir na posição Y correta
    let result = text

    pageImages.forEach((img, index) => {
      const marker = `\n\n![Figura ${img.pageNumber}-${img.imageIndex + 1}](${img.imageUrl})\n\n`
      result += marker
    })

    return result
  }
}
