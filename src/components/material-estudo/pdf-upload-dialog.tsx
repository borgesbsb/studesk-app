"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, X } from "lucide-react"
import { useState, useRef } from "react"
import { toast } from "sonner"

interface PdfUploadDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onUploadComplete: (fileUrl: string) => void
    materialId?: string
    materialNome?: string
}

export function PdfUploadDialog({
    open,
    onOpenChange,
    onUploadComplete,
    materialId,
    materialNome
}: PdfUploadDialogProps) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (file: File) => {
        // Validar se é PDF
        if (file.type !== 'application/pdf') {
            toast.error('Apenas arquivos PDF são permitidos')
            return
        }

        // Validar tamanho (máximo 50MB)
        const maxSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxSize) {
            toast.error('Arquivo muito grande. Tamanho máximo: 50MB')
            return
        }

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

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)
        try {
            // Criar FormData para enviar o arquivo
            const formData = new FormData()
            formData.append('file', selectedFile)
            if (materialId) {
                formData.append('materialId', materialId)
            }

            // Upload para API temporária
            const response = await fetch('/api/material/upload-temp-pdf', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Erro ao fazer upload do arquivo')
            }

            const data = await response.json()

            toast.success('Upload concluído!', {
                description: 'Abrindo visualizador...'
            })

            // Chamar callback com a URL do arquivo
            onUploadComplete(data.fileUrl)

            // Limpar estado e fechar diálogo
            setSelectedFile(null)
            onOpenChange(false)
        } catch (error) {
            console.error('Erro ao fazer upload:', error)
            toast.error('Erro ao fazer upload do arquivo')
        } finally {
            setUploading(false)
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload de PDF</DialogTitle>
                    <DialogDescription>
                        {materialNome ? `Envie um arquivo PDF para "${materialNome}"` : 'Selecione um arquivo PDF do seu computador'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {!selectedFile ? (
                        // Área de upload
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${dragActive
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-700 mb-1">
                                Clique para selecionar ou arraste o arquivo
                            </p>
                            <p className="text-xs text-gray-500">
                                Apenas arquivos PDF (máx. 50MB)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,application/pdf"
                                onChange={handleFileInputChange}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        // Arquivo selecionado
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <FileText className="h-10 w-10 text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleRemoveFile}
                                    className="flex-shrink-0 h-8 w-8 p-0"
                                    disabled={uploading}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Botões de ação */}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedFile(null)
                                onOpenChange(false)
                            }}
                            disabled={uploading}
                            className="border-gray-300 hover:bg-gray-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
                        >
                            {uploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
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
