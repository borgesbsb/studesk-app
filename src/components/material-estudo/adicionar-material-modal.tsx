"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, Loader2, FileText, CheckCircle2 } from "lucide-react"
import { useState, useRef } from "react"
import { toast } from "sonner"
import { criarMaterialEstudo } from "@/interface/actions/material-estudo/create"
import { PdfSourceDialog } from "./pdf-source-dialog"
import * as pdfjsLib from 'pdfjs-dist'

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

interface AdicionarMaterialModalProps {
  disciplinaId: string
  onSuccess?: () => void
  className?: string
}

export function AdicionarMaterialModal({ disciplinaId, onSuccess, className }: AdicionarMaterialModalProps) {
  const [open, setOpen] = useState(false)
  const [showSourceDialog, setShowSourceDialog] = useState(false)
  const [selectedSource, setSelectedSource] = useState<'local' | 'drive' | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [nome, setNome] = useState("")
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [arquivoPdfUrl, setArquivoPdfUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [pdfCarregado, setPdfCarregado] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setNome("")
    setTotalPaginas(0)
    setArquivoPdfUrl("")
    setSelectedFile(null)
    setPdfCarregado(false)
    setSelectedSource(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSourceSelect = (source: 'local' | 'drive') => {
    setSelectedSource(source)
    setShowSourceDialog(false)

    if (source === 'drive') {
      toast.info('Integração com Google Drive em desenvolvimento', {
        description: 'Esta funcionalidade estará disponível em breve!'
      })
      setOpen(false)
    } else {
      // Abre o modal principal para upload local
      setOpen(true)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error("Selecione apenas arquivos PDF")
      return
    }

    setSelectedFile(file)
    setNome(file.name.replace('.pdf', ''))
    setPdfCarregado(false)

    // Auto-carregar o PDF
    await handleLoadPdf(file)
  }

  const handleLoadPdf = async (file: File) => {
    setLoadingPdf(true)
    try {
      // Upload do arquivo
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao enviar arquivo")
      }

      setArquivoPdfUrl(data.fileUrl)

      // Contar páginas do PDF
      const arrayBuffer = await file.arrayBuffer()
      const typedArray = new Uint8Array(arrayBuffer)
      const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
      setTotalPaginas(pdf.numPages)
      setPdfCarregado(true)
      toast.success(`PDF carregado: ${pdf.numPages} páginas`)

    } catch (error) {
      console.error('Erro ao carregar PDF:', error)
      toast.error("Erro ao carregar o PDF")
      setArquivoPdfUrl("")
      setPdfCarregado(false)
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!arquivoPdfUrl) {
      toast.error("Aguarde o carregamento do PDF")
      return
    }

    setLoading(true)

    try {
      const response = await criarMaterialEstudo({
        nome,
        totalPaginas,
        arquivoPdfUrl,
        disciplinaIds: [disciplinaId],
      })

      if (response.success) {
        toast.success("Material adicionado com sucesso!")
        setOpen(false)
        resetForm()
        onSuccess?.()
      } else {
        toast.error(response.error || "Erro ao adicionar material")
      }
    } catch (error) {
      console.error('Erro ao processar:', error)
      toast.error(error instanceof Error ? error.message : "Erro ao adicionar material")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Botão que abre o dialog de escolha de fonte */}
      <Button
        className={className}
        onClick={() => setShowSourceDialog(true)}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Material
      </Button>

      {/* Dialog de escolha de fonte (Disco Local ou Google Drive) */}
      <PdfSourceDialog
        open={showSourceDialog}
        onOpenChange={setShowSourceDialog}
        onSelectSource={handleSourceSelect}
      />

      {/* Dialog principal de upload */}
      <Dialog open={open} onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen) resetForm()
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Adicionar Material de Estudo</DialogTitle>
            <DialogDescription>
              Faça upload de um PDF do seu computador
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome do Material */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Material</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Apostila de Português"
              required
              disabled={loadingPdf}
            />
          </div>

          {/* Upload do PDF */}
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo PDF</Label>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={loadingPdf}
                  className="cursor-pointer"
                  required
                />
              </div>

              {/* Feedback do carregamento */}
              {loadingPdf && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando PDF e contando páginas...</span>
                </div>
              )}

              {/* PDF carregado com sucesso */}
              {pdfCarregado && !loadingPdf && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="font-medium">PDF carregado com sucesso!</p>
                    <p className="text-xs text-green-600/80 mt-0.5">
                      {totalPaginas} {totalPaginas === 1 ? 'página' : 'páginas'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading || loadingPdf}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingPdf || !pdfCarregado}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
