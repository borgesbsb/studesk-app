'use client'

import { useState } from 'react'
import { getDocument, GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { FileText } from 'lucide-react'

// Configurar o worker do PDF.js
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface PdfTextExtractorProps {
  pdfUrl: string
  onTextExtracted?: (text: string) => void
}

export function PdfTextExtractor({ pdfUrl, onTextExtracted }: PdfTextExtractorProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [progress, setProgress] = useState(0)

  const cleanText = (text: string): string => {
    return text
      // Remove quebras de linha excessivas
      .replace(/\n{3,}/g, '\n\n')
      // Remove espaços em branco excessivos
      .replace(/\s{2,}/g, ' ')
      // Remove hífens de palavras quebradas entre linhas
      .replace(/(\w)-\n(\w)/g, '$1$2')
      // Remove caracteres especiais indesejados
      .replace(/[^\w\s.,!?;:'"()\-\n]/g, '')
      // Normaliza aspas e apóstrofos
      .replace(/[''‚‛]/g, "'")
      .replace(/[""„‟]/g, '"')
      // Remove espaços no início e fim
      .trim()
  }

  const extractText = async () => {
    try {
      setIsExtracting(true)
      setProgress(0)

      const loadingTask = getDocument({
        url: pdfUrl
      })
      
      const pdf = await loadingTask.promise
      const totalPages = pdf.numPages
      let extractedText = ''

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')

        extractedText += pageText + '\n\n'
        setProgress((pageNum / totalPages) * 100)
      }

      const cleanedText = cleanText(extractedText)
      onTextExtracted?.(cleanedText)

      // Criar um blob com o texto limpo
      const blob = new Blob([cleanedText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      // Criar um link para download e clicar nele
      const link = document.createElement('a')
      link.href = url
      link.download = 'texto-extraido.txt'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Erro ao extrair texto:', error)
    } finally {
      setIsExtracting(false)
      setProgress(0)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 hover:text-blue-500"
      onClick={extractText}
      disabled={isExtracting}
      title="Extrair texto do PDF"
    >
      {isExtracting ? (
        <div className="w-full h-full relative flex items-center justify-center">
          <Progress value={progress} className="h-1 w-8 absolute bottom-1" />
          <FileText className="h-4 w-4 animate-pulse" />
        </div>
      ) : (
        <FileText className="h-4 w-4" />
      )}
    </Button>
  )
} 