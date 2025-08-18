'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Eye, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'
import { extractTextFromPdf } from '@/utils/pdf-utils'

interface PdfTextDebugProps {
  pdfUrl: string
  materialNome?: string
}

export function PdfTextDebug({ pdfUrl, materialNome }: PdfTextDebugProps) {
  const [isExtracting, setIsExtracting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [extractedParagraphs, setExtractedParagraphs] = useState<string[]>([])
  const [textStats, setTextStats] = useState({
    totalParagraphs: 0,
    totalCharacters: 0,
    usedParagraphs: 0,
    usedCharacters: 0,
    textForQuestions: ''
  })

  const handleExtractAndAnalyze = async () => {
    try {
      setIsExtracting(true)
      toast.info('Extraindo e analisando texto do PDF...')

      // Extrair texto do PDF
      const paragraphs = await extractTextFromPdf(pdfUrl)
      
      if (!paragraphs || paragraphs.length === 0) {
        toast.error('Não foi possível extrair texto do PDF')
        return
      }

      setExtractedParagraphs(paragraphs)

      // Simular o mesmo processamento que o gerador de questões faz
      const filteredParagraphs = paragraphs.filter(p => p.length > 100)
      const usedParagraphs = filteredParagraphs.slice(0, 3)
      const textForQuestions = usedParagraphs.join('\n\n')

      setTextStats({
        totalParagraphs: paragraphs.length,
        totalCharacters: paragraphs.join('').length,
        usedParagraphs: usedParagraphs.length,
        usedCharacters: textForQuestions.length,
        textForQuestions
      })

      setIsModalOpen(true)
      toast.success('Texto extraído e analisado com sucesso!')

    } catch (error) {
      console.error('Erro ao extrair texto:', error)
      toast.error('Erro ao extrair texto do PDF')
    } finally {
      setIsExtracting(false)
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Texto copiado para a área de transferência')
    } catch (error) {
      toast.error('Erro ao copiar texto')
    }
  }

  const downloadText = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Arquivo baixado com sucesso')
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 hover:text-blue-500"
        onClick={handleExtractAndAnalyze}
        disabled={isExtracting}
        title="Debug: Visualizar texto extraído"
      >
        {isExtracting ? (
          <FileText className="h-4 w-4 animate-pulse" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Debug: Texto Extraído do PDF
            </DialogTitle>
            <DialogDescription>
              Análise detalhada do texto extraído de: <strong>{materialNome}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total de Parágrafos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{textStats.totalParagraphs}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Parágrafos Usados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{textStats.usedParagraphs}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Caracteres Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{textStats.totalCharacters.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Caracteres Enviados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{textStats.usedCharacters.toLocaleString()}</div>
                </CardContent>
              </Card>
            </div>

            {/* Texto que será enviado para a OpenAI */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Texto Enviado para OpenAI</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Este é exatamente o texto que será usado para gerar as questões
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => copyText(textStats.textForQuestions)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => downloadText(textStats.textForQuestions, 'texto-para-questoes.txt')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-60 w-full border rounded-md p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {textStats.textForQuestions || 'Nenhum texto extraído'}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Lista de todos os parágrafos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Todos os Parágrafos Extraídos</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Lista completa de parágrafos com indicação de quais são usados
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadText(extractedParagraphs.join('\n\n---\n\n'), 'todos-paragrafos.txt')}
                >
                  <Download className="h-4 w-4" />
                  Download Completo
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80 w-full">
                  <div className="space-y-4">
                    {extractedParagraphs.map((paragraph, index) => {
                      const isUsed = index < 3 && paragraph.length > 100
                      const isFiltered = paragraph.length <= 100
                      
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Parágrafo {index + 1}</span>
                              {isUsed && <Badge className="bg-green-100 text-green-800">Usado para questões</Badge>}
                              {isFiltered && <Badge variant="secondary">Filtrado (muito curto)</Badge>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {paragraph.length} caracteres
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => copyText(paragraph)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm bg-muted rounded p-2 max-h-32 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{paragraph}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 