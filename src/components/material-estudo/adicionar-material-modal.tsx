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
import { Plus, Upload, Loader2, FileText, CheckCircle2, Video } from "lucide-react"
import { useState, useRef } from "react"
import { toast } from "sonner"
import { criarMaterialEstudo } from "@/interface/actions/material-estudo/create"
import { PdfSourceDialog } from "./pdf-source-dialog"
import { GoogleDrivePicker } from "./google-drive-picker"
import { pdfCacheService } from "@/services/pdf-cache.service"
import { videoCacheService } from "@/services/video-cache.service"
import * as pdfjsLib from 'pdfjs-dist'

// Configurar o worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

type MaterialTipo = 'PDF' | 'VIDEO'

interface AdicionarMaterialModalProps {
  disciplinaId: string
  onSuccess?: () => void
  className?: string
}

export function AdicionarMaterialModal({ disciplinaId, onSuccess, className }: AdicionarMaterialModalProps) {
  const [open, setOpen] = useState(false)
  const [showSourceDialog, setShowSourceDialog] = useState(false)
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [selectedSource, setSelectedSource] = useState<'local' | 'drive' | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [tipo, setTipo] = useState<MaterialTipo>('PDF')
  const [nome, setNome] = useState("")
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [duracaoSegundos, setDuracaoSegundos] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileCarregado, setFileCarregado] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setTipo('PDF')
    setNome("")
    setTotalPaginas(0)
    setDuracaoSegundos(0)
    setSelectedFile(null)
    setFileCarregado(false)
    setSelectedSource(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSourceSelect = (source: 'local' | 'drive') => {
    setSelectedSource(source)
    setShowSourceDialog(false)

    if (source === 'drive') {
      // Abrir picker do Google Drive
      setShowDrivePicker(true)
    } else {
      // Abre o modal principal para upload local
      setOpen(true)
    }
  }

  const handleDriveFileImported = () => {
    // Callback quando arquivo do Drive foi importado com sucesso
    setShowDrivePicker(false)
    onSuccess?.()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tipo de arquivo
    const validPdfTypes = ['application/pdf']
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

    if (tipo === 'PDF' && !validPdfTypes.includes(file.type)) {
      toast.error("Selecione apenas arquivos PDF")
      return
    }

    if (tipo === 'VIDEO' && !validVideoTypes.includes(file.type)) {
      toast.error("Selecione apenas arquivos de vídeo (MP4, WebM, MOV)")
      return
    }

    setSelectedFile(file)
    const extensao = tipo === 'PDF' ? '.pdf' : file.name.substring(file.name.lastIndexOf('.'))
    setNome(file.name.replace(extensao, ''))
    setFileCarregado(false)

    // Auto-carregar o arquivo
    await handleLoadFile(file)
  }

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'

      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        resolve(Math.floor(video.duration))
      }

      video.onerror = () => {
        reject(new Error('Erro ao carregar metadados do vídeo'))
      }

      video.src = URL.createObjectURL(file)
    })
  }

  const handleLoadFile = async (file: File) => {
    setLoadingFile(true)
    try {
      if (tipo === 'PDF') {
        // Contar páginas do PDF
        const arrayBuffer = await file.arrayBuffer()
        const typedArray = new Uint8Array(arrayBuffer)
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise
        setTotalPaginas(pdf.numPages)

        toast.success(`PDF carregado: ${pdf.numPages} páginas`, {
          description: 'Será salvo apenas no seu navegador'
        })
      } else {
        // Obter duração do vídeo
        const duracao = await getVideoDuration(file)
        setDuracaoSegundos(duracao)

        const minutos = Math.floor(duracao / 60)
        const segundos = duracao % 60
        toast.success(`Vídeo carregado: ${minutos}m ${segundos}s`, {
          description: 'Será salvo apenas no seu navegador'
        })
      }

      setFileCarregado(true)

    } catch (error) {
      console.error(`Erro ao carregar ${tipo}:`, error)
      toast.error(`Erro ao processar o ${tipo === 'PDF' ? 'PDF' : 'vídeo'}`)
      setFileCarregado(false)
    } finally {
      setLoadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile || !fileCarregado) {
      toast.error(`Aguarde o carregamento do ${tipo === 'PDF' ? 'PDF' : 'vídeo'}`)
      return
    }

    setLoading(true)

    try {
      let arquivoPdfUrl = ''
      let arquivoVideoUrl = ''

      // 1. Upload do arquivo para o servidor (se for PDF)
      if (tipo === 'PDF') {
        console.log('🔵 [UPLOAD] Fazendo upload do PDF para o servidor...')
        const formData = new FormData()
        formData.append('file', selectedFile)

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          throw new Error(errorData.error || 'Erro ao fazer upload do arquivo')
        }

        const uploadData = await uploadResponse.json()
        arquivoPdfUrl = uploadData.fileUrl
        console.log('✅ [UPLOAD] Upload concluído. URL:', arquivoPdfUrl)
      }

      // 2. Criar material no banco com a URL do arquivo
      console.log('\n' + '='.repeat(80))
      console.log('📦 [CRIAR MATERIAL] Criando material no banco de dados...')
      console.log('='.repeat(80))
      console.log('   Nome:', nome)
      console.log('   Tipo:', tipo)
      if (tipo === 'PDF') {
        console.log('   Total de páginas:', totalPaginas)
        console.log('   URL do PDF:', arquivoPdfUrl)
      }
      console.log('='.repeat(80) + '\n')

      const response = await criarMaterialEstudo({
        nome,
        tipo,
        totalPaginas: tipo === 'PDF' ? totalPaginas : 0,
        duracaoSegundos: tipo === 'VIDEO' ? duracaoSegundos : undefined,
        arquivoPdfUrl,
        arquivoVideoUrl,
        disciplinaIds: [disciplinaId],
      })

      if (!response.success || !response.data) {
        throw new Error(response.error || "Erro ao criar material")
      }

      const materialId = response.data.id

      console.log('\n' + '='.repeat(80))
      console.log('✅ [SUCESSO] Material criado com ID:', materialId)
      if (tipo === 'PDF') {
        console.log('🚀 [BACKGROUND] Processamento com IA iniciado no servidor!')
        console.log('📊 [INFO] Acompanhe o progresso no TERMINAL DO SERVIDOR (onde você rodou npm run dev)')
        console.log('💡 [DICA] Os logs detalhados aparecem no terminal, não nesta console do navegador')
      }
      console.log('='.repeat(80) + '\n')

      // 3. Salvar arquivo no IndexedDB (cache local para acesso offline)
      if (tipo === 'PDF') {
        console.log('💾 [CACHE] Salvando PDF no cache local (IndexedDB)...')
        await pdfCacheService.savePdf(materialId, selectedFile)
        console.log('✅ [CACHE] PDF salvo no cache local')
      } else {
        console.log('💾 [CACHE] Salvando vídeo no cache local (IndexedDB)...')
        await videoCacheService.saveVideo(materialId, selectedFile, duracaoSegundos)
        console.log('✅ [CACHE] Vídeo salvo no cache local')
      }

      toast.success("Material adicionado com sucesso!", {
        description: tipo === 'PDF'
          ? 'PDF enviado ao servidor e processamento com IA iniciado. Veja o terminal do servidor para logs detalhados.'
          : 'Vídeo salvo no cache local do navegador',
        duration: 5000
      })

      setOpen(false)
      resetForm()
      onSuccess?.()

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

      {/* Google Drive Picker */}
      <GoogleDrivePicker
        open={showDrivePicker}
        onOpenChange={setShowDrivePicker}
        onFileImported={handleDriveFileImported}
        disciplinaId={disciplinaId}
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
              Faça upload de um {tipo === 'PDF' ? 'PDF' : 'vídeo'} do seu computador
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seletor de Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Material</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setTipo('PDF')
                  setSelectedFile(null)
                  setFileCarregado(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                  tipo === 'PDF'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span className="font-medium">PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTipo('VIDEO')
                  setSelectedFile(null)
                  setFileCarregado(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${
                  tipo === 'VIDEO'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Video className="h-5 w-5" />
                <span className="font-medium">Vídeo</span>
              </button>
            </div>
          </div>

          {/* Nome do Material */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Material</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder={tipo === 'PDF' ? 'Ex: Apostila de Português' : 'Ex: Aula 01 - Introdução'}
              required
              disabled={loadingFile}
            />
          </div>

          {/* Upload do Arquivo */}
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo {tipo === 'PDF' ? 'PDF' : 'de Vídeo'}</Label>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  id="file"
                  type="file"
                  accept={tipo === 'PDF' ? '.pdf' : '.mp4,.webm,.ogg,.mov'}
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  disabled={loadingFile}
                  className="cursor-pointer"
                  required
                />
              </div>

              {/* Feedback do carregamento */}
              {loadingFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando {tipo === 'PDF' ? 'PDF e contando páginas' : 'vídeo e obtendo duração'}...</span>
                </div>
              )}

              {/* Arquivo carregado com sucesso */}
              {fileCarregado && !loadingFile && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-md">
                  <CheckCircle2 className="h-4 w-4" />
                  <div className="flex-1">
                    <p className="font-medium">{tipo === 'PDF' ? 'PDF' : 'Vídeo'} carregado com sucesso!</p>
                    <p className="text-xs text-green-600/80 mt-0.5">
                      {tipo === 'PDF'
                        ? `${totalPaginas} ${totalPaginas === 1 ? 'página' : 'páginas'}`
                        : `${Math.floor(duracaoSegundos / 60)}m ${duracaoSegundos % 60}s de duração`
                      }
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
              disabled={loading || loadingFile}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || loadingFile || !fileCarregado}
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
