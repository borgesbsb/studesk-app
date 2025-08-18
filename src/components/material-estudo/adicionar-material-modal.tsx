"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Upload, Loader2, FileText } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { criarMaterialEstudo } from "@/interface/actions/material-estudo/create"
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
  const [loading, setLoading] = useState(false)
  const [loadingPdf, setLoadingPdf] = useState(false)
  const [nome, setNome] = useState("")
  const [totalPaginas, setTotalPaginas] = useState("")
  const [arquivoPdfUrl, setArquivoPdfUrl] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error("Por favor, selecione apenas arquivos PDF")
        return
      }
      setSelectedFile(file)
      setNome(file.name.replace('.pdf', ''))
    }
  }

  const handleLoadPdf = async () => {
    if (!selectedFile) {
      toast.error("Por favor, selecione um arquivo PDF primeiro")
      return
    }

    setLoadingPdf(true)
    try {
      // Primeiro fazer o upload do arquivo
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || "Erro ao enviar arquivo")
      }

      setArquivoPdfUrl(data.fileUrl)

      // Carregar o PDF para contar as páginas
      try {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const typedArray = new Uint8Array(arrayBuffer)
        
        // Carregar o PDF e contar páginas
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
        setTotalPaginas(String(pdf.numPages))
        toast.success("PDF carregado com sucesso!")
      } catch (pdfError) {
        console.error('Erro ao ler PDF:', pdfError)
        toast.error("Erro ao ler o PDF. O arquivo pode estar corrompido.")
        throw pdfError
      }
      
    } catch (error) {
      console.error('Erro ao carregar PDF:', error)
      toast.error("Erro ao carregar o PDF. Por favor, tente novamente.")
      setArquivoPdfUrl("")
    } finally {
      setLoadingPdf(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!arquivoPdfUrl) {
      toast.error("Por favor, carregue o PDF primeiro")
      return
    }

    setLoading(true)

    try {
      const response = await criarMaterialEstudo({
        nome,
        totalPaginas: parseInt(totalPaginas),
        arquivoPdfUrl,
        disciplinaIds: [disciplinaId],
      })

      if (response.success) {
        toast.success("Material adicionado com sucesso!")
        setOpen(false)
        onSuccess?.()
        // Limpar formulário
        setNome("")
        setTotalPaginas("")
        setArquivoPdfUrl("")
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={className}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar Material de Estudo</DialogTitle>
            <DialogDescription>
              Adicione um novo material de estudo para esta disciplina.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Material</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Apostila de Português"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>PDF do Material</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept=".pdf"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleLoadPdf}
                  disabled={!selectedFile || loadingPdf}
                >
                  {loadingPdf ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Carregar PDF
                    </>
                  )}
                </Button>
              </div>
              {arquivoPdfUrl && (
                <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                  <FileText className="h-4 w-4" />
                  <span>PDF carregado com sucesso!</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalPaginas">Total de Páginas</Label>
              <Input
                id="totalPaginas"
                type="number"
                min="1"
                value={totalPaginas}
                onChange={(e) => setTotalPaginas(e.target.value)}
                placeholder="Será preenchido automaticamente ao carregar o PDF"
                required
                readOnly
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !arquivoPdfUrl}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Material"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 