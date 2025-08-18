'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Copy, Download } from "lucide-react"
import { toast } from "sonner"

interface TextPreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  text: string
  title: string
}

export function TextPreviewModal({
  open,
  onOpenChange,
  text,
  title
}: TextPreviewModalProps) {
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Texto copiado para a área de transferência!')
    } catch (error) {
      toast.error('Erro ao copiar texto')
    }
  }

  const handleDownloadText = () => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'texto-extraido.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Download iniciado!')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto pr-2">
          <div className="space-y-8">
            {text.split('\n\nQuestões Geradas:\n\n').map((section, index) => {
              if (index === 0) {
                // Seção do texto extraído
                return (
                  <div key="texto" className="space-y-2">
                    <h3 className="text-lg font-semibold">Texto Extraído</h3>
                    <div className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm">
                      {section.replace('Texto Extraído:\n\n', '')}
                    </div>
                  </div>
                )
              } else {
                // Seção das questões
                return (
                  <div key="questoes" className="space-y-6">
                    <h3 className="text-lg font-semibold">Questões Geradas</h3>
                    {section.split('\n\nQuestão').filter(q => q.trim()).map((questao, qIndex) => {
                      const [enunciado, ...alternativas] = questao.split('\n\nAlternativas:\n').map(s => s.trim())
                      return (
                        <div key={qIndex} className="bg-muted p-4 rounded-lg space-y-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Questão {qIndex + 1}</h4>
                            <p className="text-sm">{enunciado.replace(/^\d+:\n/, '')}</p>
                          </div>
                          <div className="space-y-2">
                            {alternativas[0].split('\n').map((alt, aIndex) => {
                              const isCorreta = alt.includes('(Correta)')
                              const texto = alt.replace(' (Correta)', '')
                              const explicacao = isCorreta ? 
                                alt.split('\nExplicação: ')[1] : null

                              return (
                                <div 
                                  key={aIndex} 
                                  className={`p-2 rounded ${
                                    isCorreta ? 'bg-green-100 dark:bg-green-900/20' : 'bg-background'
                                  }`}
                                >
                                  <p className="text-sm">
                                    {texto}
                                    {isCorreta && (
                                      <span className="ml-2 text-green-600 dark:text-green-400 text-xs font-medium">
                                        (Correta)
                                      </span>
                                    )}
                                  </p>
                                  {explicacao && (
                                    <p className="mt-2 text-xs text-muted-foreground border-t pt-2">
                                      <span className="font-medium">Explicação:</span> {explicacao}
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 