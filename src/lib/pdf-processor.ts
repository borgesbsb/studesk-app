import { PDFDocument } from 'pdf-lib'

export async function processarPDF(pdfUrl: string): Promise<string> {
  try {
    // Busca o PDF
    const response = await fetch(pdfUrl)
    const pdfBytes = await response.arrayBuffer()

    // Carrega o PDF com configurações otimizadas
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      updateMetadata: false,
      ignoreEncryption: true,
    })

    // Ajusta as configurações de cada página
    const pages = pdfDoc.getPages()
    for (const page of pages) {
      // Força o modo de renderização para melhor qualidade
      const { width, height } = page.getSize()
      page.setSize(width, height)
    }

    // Configura as opções de compressão e qualidade
    const pdfBytes2 = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false,
      objectsPerTick: 20,
      updateFieldAppearances: true,
    })

    // Converte o PDF processado para uma URL de dados
    const blob = new Blob([pdfBytes2], { type: 'application/pdf' })
    return URL.createObjectURL(blob)
  } catch (error) {
    console.error('Erro ao processar PDF:', error)
    return pdfUrl // Retorna a URL original em caso de erro
  }
} 