"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cloud, Loader2, FileText, Calendar, HardDrive, CheckCircle2, Search, Folder, ChevronRight, Home, Video } from "lucide-react"
import { toast } from "sonner"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  thumbnailLink?: string
  createdTime: string
  modifiedTime: string
  isFolder?: boolean
  parents?: string[]
}

interface BreadcrumbItem {
  id: string
  name: string
}

interface GoogleDrivePickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFileImported: () => void
  disciplinaId: string
}

export function GoogleDrivePicker({
  open,
  onOpenChange,
  onFileImported,
  disciplinaId
}: GoogleDrivePickerProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [files, setFiles] = useState<DriveFile[]>([])
  const [filteredFiles, setFilteredFiles] = useState<DriveFile[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Meu Drive' }])

  // Verificar se já está conectado ao carregar
  useEffect(() => {
    const verificarECarregar = async () => {
      if (open) {
        await checkConnection()
      }
    }
    verificarECarregar()
  }, [open])

  // Filtrar arquivos baseado na busca
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFiles(files)
    } else {
      const filtered = files.filter(file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredFiles(filtered)
    }
  }, [searchTerm, files])

  const loadFiles = async (folderId: string | null = null) => {
    try {
      setIsLoadingFiles(true)
      const url = folderId
        ? `/api/google-drive/files?folderId=${folderId}`
        : '/api/google-drive/files'

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setIsConnected(true)
        setFiles(data.files || [])
        setFilteredFiles(data.files || [])
        setCurrentFolderId(folderId)
      } else if (response.status === 401) {
        setIsConnected(false)
      }
    } catch (error) {
      console.error('Erro ao carregar arquivos:', error)
      toast.error('Erro ao carregar arquivos do Google Drive')
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const checkConnection = async () => {
    await loadFiles(null)
  }

  const handleFolderClick = async (folder: DriveFile) => {
    // Adicionar pasta ao breadcrumb
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    // Carregar arquivos da pasta
    await loadFiles(folder.id)
    // Limpar seleção
    setSelectedFileId(null)
  }

  const handleBreadcrumbClick = async (index: number) => {
    // Atualizar breadcrumb
    const newBreadcrumb = breadcrumb.slice(0, index + 1)
    setBreadcrumb(newBreadcrumb)

    // Carregar arquivos da pasta selecionada
    const folderId = newBreadcrumb[newBreadcrumb.length - 1].id
    await loadFiles(folderId === 'root' ? null : folderId)

    // Limpar seleção
    setSelectedFileId(null)
  }

  const handleImport = async () => {
    if (!selectedFileId) {
      toast.error('Selecione um arquivo')
      return
    }

    const selectedFile = files.find(f => f.id === selectedFileId)
    if (!selectedFile) return

    if (selectedFile.isFolder) {
      toast.error('Selecione um arquivo, não uma pasta')
      return
    }

    setIsImporting(true)

    try {
      // Detectar tipo de arquivo
      const isVideo = selectedFile.mimeType.startsWith('video/')
      const isPdf = selectedFile.mimeType === 'application/pdf'

      if (!isVideo && !isPdf) {
        throw new Error('Apenas PDFs e vídeos são suportados')
      }

      // Escolher endpoint correto baseado no tipo
      const endpoint = isVideo ? '/api/google-drive/import-video' : '/api/google-drive/import-pdf'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          disciplinaId,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Erro ao importar ${isVideo ? 'vídeo' : 'PDF'}`)
      }

      if (isVideo) {
        const duration = data.material.duracaoSegundos
        const minutes = Math.floor(duration / 60)
        const seconds = duration % 60

        toast.success('Vídeo importado com sucesso!', {
          description: `Duração estimada: ${minutes}min ${seconds}s`
        })
      } else {
        toast.success('PDF importado com sucesso!', {
          description: `${data.material.totalPaginas} páginas`
        })
      }

      onFileImported()
      onOpenChange(false)

      // Reset state
      setSelectedFileId(null)
      setSearchTerm("")

    } catch (error) {
      console.error('Erro ao importar arquivo:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao importar arquivo')
    } finally {
      setIsImporting(false)
    }
  }

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-'
    const size = parseInt(bytes)
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[80vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-green-600" />
            Importar do Google Drive
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do Google Drive e selecione um PDF para importar
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Mensagem quando não está conectado */}
          {!isConnected && !isLoadingFiles && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <Cloud className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Google Drive não conectado
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md">
                Para importar arquivos do Google Drive, você precisa conectar sua conta primeiro.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    window.location.href = window.location.pathname.replace(/\/[^/]+$/, '/perfil')
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Conectar Google Drive
                </Button>
              </div>
            </div>
          )}

          {/* Loading inicial */}
          {isLoadingFiles && !isConnected && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-600">Verificando conexão...</span>
            </div>
          )}

          {/* Lista de arquivos */}
          {isConnected && (
            <>
              {/* Breadcrumb */}
              <div className="mb-3">
                <div className="flex items-center gap-1 text-sm text-gray-600 overflow-x-auto pb-1">
                  {breadcrumb.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-1 flex-shrink-0">
                      {index > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
                      <button
                        onClick={() => handleBreadcrumbClick(index)}
                        className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
                          index === breadcrumb.length - 1 ? 'font-semibold text-blue-600' : 'text-gray-600'
                        }`}
                      >
                        {index === 0 && <Home className="h-3 w-3" />}
                        <span>{item.name}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Busca */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar na pasta atual..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto border rounded-lg">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-600">Carregando arquivos...</span>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mb-2 text-gray-300" />
                    <p className="text-sm">
                      {searchTerm ? 'Nenhum arquivo encontrado' : 'Nenhum arquivo ou pasta encontrada'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredFiles.map((file) => {
                      const isFolder = file.isFolder
                      const isVideo = file.mimeType.startsWith('video/')
                      const isPdf = file.mimeType === 'application/pdf'
                      const isSelected = selectedFileId === file.id && !isFolder

                      return (
                        <button
                          key={file.id}
                          onClick={() => isFolder ? handleFolderClick(file) : setSelectedFileId(file.id)}
                          onDoubleClick={() => isFolder && handleFolderClick(file)}
                          className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors text-left ${
                            isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          } ${isFolder ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {isFolder ? (
                              <Folder className="h-5 w-5 text-yellow-500" />
                            ) : isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                            ) : isVideo ? (
                              <Video className="h-5 w-5 text-purple-600" />
                            ) : isPdf ? (
                              <FileText className="h-5 w-5 text-red-600" />
                            ) : (
                              <FileText className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm text-gray-900 truncate ${isFolder ? 'font-semibold' : ''}`}>
                              {file.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {!isFolder && (
                                <span className="flex items-center gap-1">
                                  <HardDrive className="h-3 w-3" />
                                  {formatFileSize(file.size)}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(file.modifiedTime)}
                              </span>
                              {isFolder && (
                                <span className="text-blue-600 font-medium">
                                  Clique para abrir
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={isImporting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFileId || isImporting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Cloud className="h-4 w-4 mr-2" />
                      Importar Selecionado
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
