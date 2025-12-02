"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X, Database, Video } from "lucide-react"
import { toast } from "sonner"
import { pdfCacheService } from "@/services/pdf-cache.service"
import { videoCacheService } from "@/services/video-cache.service"

type MediaType = 'PDF' | 'VIDEO'

interface MediaUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUploadComplete: (fileUrl: string, mediaType: MediaType) => void
    materialId?: string
    materialNome?: string
    mediaType?: MediaType
}

export function MediaUploadDialog({
    open,
    onOpenChange,
    onUploadComplete,
    materialId,
    materialNome,
    mediaType = 'PDF'
}: MediaUploadDialogProps) {
    const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
    const [uploading, setUploading] = React.useState(false)
    const [dragActive, setDragActive] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    // Debug: Log quando o modal abre
    React.useEffect(() => {
        if (open) {
            console.log('🎬 MediaUploadDialog aberto:', {
                materialId,
                materialNome,
                mediaType,
                acceptedTypes: mediaType === 'PDF' ? 'application/pdf' : 'video/mp4,video/webm,video/ogg,video/quicktime'
            })
        }
    }, [open, materialId, materialNome, mediaType])

    const acceptedTypes = mediaType === 'PDF'
        ? 'application/pdf'
        : 'video/mp4,video/webm,video/ogg,video/quicktime'

    const acceptedExtensions = mediaType === 'PDF'
        ? '.pdf'
        : '.mp4,.webm,.ogg,.mov'

    const maxSize = mediaType === 'PDF' ? 50 * 1024 * 1024 : 500 * 1024 * 1024 // 50MB para PDF, 500MB para vídeo

    const handleFileSelect = (file: File) => {
        console.log('📁 Arquivo selecionado:', {
            nome: file.name,
            tipo: file.type,
            tamanho: file.size,
            mediaTypeEsperado: mediaType
        })

        // Validar tipo
        const validTypes = mediaType === 'PDF'
            ? ['application/pdf']
            : ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

        console.log('✅ Tipos válidos:', validTypes)
        console.log('🔍 Arquivo type:', file.type)

        if (!validTypes.includes(file.type)) {
            console.error('❌ Tipo de arquivo inválido:', file.type, 'esperado:', validTypes)
            toast.error(`Apenas arquivos ${mediaType === 'PDF' ? 'PDF' : 'de vídeo'} são permitidos`)
            return
        }

        // Validar tamanho
        if (file.size > maxSize) {
            const maxSizeFormatted = formatFileSize(maxSize)
            console.error('❌ Arquivo muito grande:', file.size, 'max:', maxSize)
            toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSizeFormatted}`)
            return
        }

        console.log('✅ Arquivo válido! Selecionando...')
        setSelectedFile(file)
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0])
        }
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
        }
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

    const handleUpload = async () => {
        if (!selectedFile || !materialId) return

        setUploading(true)
        try {
            if (mediaType === 'PDF') {
                // Upload de PDF
                console.log('💾 Salvando PDF no cache local (IndexedDB)...')
                await pdfCacheService.savePdf(materialId, selectedFile)

                const blob = new Blob([selectedFile], { type: 'application/pdf' })
                const blobUrl = URL.createObjectURL(blob)

                toast.success('PDF salvo no cache local!', {
                    description: 'Carregamento offline disponível',
                    icon: <Database className="h-4 w-4" />
                })

                // Upload opcional para servidor
                uploadToServerInBackground(selectedFile, materialId, 'PDF')

                onUploadComplete(blobUrl, 'PDF')
            } else {
                // Upload de vídeo
                console.log('💾 Salvando vídeo no cache local (IndexedDB)...')

                // Obter duração do vídeo
                const duracao = await getVideoDuration(selectedFile)

                await videoCacheService.saveVideo(materialId, selectedFile, duracao)

                const blob = new Blob([selectedFile], { type: selectedFile.type })
                const blobUrl = URL.createObjectURL(blob)

                toast.success('Vídeo salvo no cache local!', {
                    description: 'Carregamento offline disponível',
                    icon: <Database className="h-4 w-4" />
                })

                // Upload opcional para servidor
                uploadToServerInBackground(selectedFile, materialId, 'VIDEO')

                onUploadComplete(blobUrl, 'VIDEO')
            }

            setSelectedFile(null)
            onOpenChange(false)
        } catch (error) {
            console.error('Erro ao processar upload:', error)
            toast.error(`Erro ao salvar ${mediaType === 'PDF' ? 'PDF' : 'vídeo'} no cache local`)
        } finally {
            setUploading(false)
        }
    }

    // Upload para servidor em background (não bloqueia UI)
    const uploadToServerInBackground = async (file: File, matId: string, type: MediaType) => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('materialId', matId)
            formData.append('type', type)

            const response = await fetch('/api/material/upload-temp-pdf', {
                method: 'POST',
                body: formData
            })

            if (response.ok) {
                console.log(`✅ Backup de ${type} no servidor concluído`)
            }
        } catch (error) {
            console.warn(`⚠️ Falha no backup do servidor (${type} permanece no cache local):`, error)
        }
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const fileIcon = mediaType === 'PDF' ? FileText : Video
    const fileIconColor = mediaType === 'PDF' ? 'text-red-600' : 'text-purple-600'
    const fileBgColor = mediaType === 'PDF' ? 'bg-red-100' : 'bg-purple-100'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">
                        Upload de {mediaType === 'PDF' ? 'PDF' : 'Vídeo'}
                    </DialogTitle>
                    <DialogDescription className="text-sm space-y-1">
                        <div>
                            {materialNome
                                ? `Envie um arquivo ${mediaType === 'PDF' ? 'PDF' : 'de vídeo'} para "${materialNome}"`
                                : `Selecione um arquivo ${mediaType === 'PDF' ? 'PDF' : 'de vídeo'} do seu computador`
                            }
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-flex">
                            <Database className="h-3 w-3" />
                            <span>Salvo localmente para acesso offline</span>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!selectedFile ? (
                        // Área de upload
                        <div
                            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${dragActive
                                    ? 'border-blue-500 bg-blue-50 shadow-lg'
                                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 hover:shadow-md'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <div className="rounded-full bg-blue-100 p-4">
                                    <Upload className="h-8 w-8 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-base font-semibold text-gray-900 mb-1">
                                        Arraste e solte seu arquivo aqui
                                    </p>
                                    <p className="text-sm text-gray-600 mb-2">
                                        ou clique para selecionar
                                    </p>
                                    <p className="text-xs text-gray-500 bg-gray-100 inline-block px-3 py-1 rounded-full">
                                        {mediaType === 'PDF'
                                            ? 'Apenas PDF • Máximo 50MB'
                                            : 'MP4, WebM, MOV • Máximo 500MB'
                                        }
                                    </p>
                                </div>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={acceptedTypes}
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        // Arquivo selecionado
                        <div className={`border-2 border-green-200 rounded-xl p-5 bg-green-50`}>
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <div className={`rounded-lg ${fileBgColor} p-3`}>
                                        {(() => {
                                            const Icon = fileIcon
                                            return <Icon className={`h-8 w-8 ${fileIconColor}`} />
                                        })()}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">
                                        Arquivo selecionado
                                    </p>
                                    <p className="text-sm font-medium text-gray-700 truncate mb-1">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-gray-600 bg-white inline-block px-2 py-1 rounded">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                    className="flex-shrink-0 h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                                    disabled={uploading}
                                    title="Remover arquivo"
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Botões de ação */}
                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="lg"
                            onClick={() => {
                                setSelectedFile(null)
                                onOpenChange(false)
                            }}
                            disabled={uploading}
                            className="flex-1 border-2 border-gray-300 hover:bg-gray-100 font-medium"
                        >
                            Cancelar
                        </Button>
                        <Button
                            size="lg"
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-5 w-5 mr-2" />
                                    Enviar e Abrir
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
