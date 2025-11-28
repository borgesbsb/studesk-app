"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Database, Trash2, RefreshCw, HardDrive, Download, Calendar } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { pdfCacheService } from "@/services/pdf-cache.service"

interface CacheManagerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

interface CachedPdf {
    id: string
    nome: string
    size: number
    timestamp: number
}

interface CacheStats {
    totalPdfs: number
    totalSize: number
    totalSizeFormatted: string
    maxSize: number
    maxSizeFormatted: string
    usagePercentage: number
}

export function CacheManagerDialog({ open, onOpenChange }: CacheManagerDialogProps) {
    const [cachedPdfs, setCachedPdfs] = useState<CachedPdf[]>([])
    const [stats, setStats] = useState<CacheStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [clearing, setClearing] = useState(false)

    useEffect(() => {
        if (open) {
            loadCacheData()
        }
    }, [open])

    const loadCacheData = async () => {
        setLoading(true)
        try {
            const [pdfs, cacheStats] = await Promise.all([
                pdfCacheService.listCachedPdfs(),
                pdfCacheService.getStats()
            ])

            setCachedPdfs(pdfs.sort((a, b) => b.timestamp - a.timestamp))
            setStats(cacheStats)
        } catch (error) {
            console.error('Erro ao carregar dados do cache:', error)
            toast.error('Erro ao carregar informações do cache')
        } finally {
            setLoading(false)
        }
    }

    const handleClearCache = async () => {
        if (!confirm('Tem certeza que deseja limpar todo o cache? Esta ação não pode ser desfeita.')) {
            return
        }

        setClearing(true)
        try {
            await pdfCacheService.clearCache()
            toast.success('Cache limpo com sucesso!')
            await loadCacheData()
        } catch (error) {
            console.error('Erro ao limpar cache:', error)
            toast.error('Erro ao limpar cache')
        } finally {
            setClearing(false)
        }
    }

    const handleRemovePdf = async (id: string, nome: string) => {
        if (!confirm(`Remover "${nome}" do cache?`)) {
            return
        }

        try {
            await pdfCacheService.removePdf(id)
            toast.success('PDF removido do cache')
            await loadCacheData()
        } catch (error) {
            console.error('Erro ao remover PDF:', error)
            toast.error('Erro ao remover PDF do cache')
        }
    }

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
    }

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp)
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Gerenciador de Cache Local
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                        Visualize e gerencie PDFs armazenados localmente para acesso offline
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                    {/* Estatísticas do Cache */}
                    {stats && (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Download className="h-4 w-4 text-blue-600" />
                                    <span className="text-xs font-medium text-blue-700">PDFs Salvos</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-900">{stats.totalPdfs}</p>
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <HardDrive className="h-4 w-4 text-purple-600" />
                                    <span className="text-xs font-medium text-purple-700">Espaço Usado</span>
                                </div>
                                <p className="text-2xl font-bold text-purple-900">{stats.totalSizeFormatted}</p>
                                <p className="text-xs text-purple-600 mt-0.5">de {stats.maxSizeFormatted}</p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Database className="h-4 w-4 text-green-600" />
                                    <span className="text-xs font-medium text-green-700">Uso do Cache</span>
                                </div>
                                <p className="text-2xl font-bold text-green-900">
                                    {stats.usagePercentage.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Barra de progresso */}
                    {stats && (
                        <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
                                style={{ width: `${Math.min(stats.usagePercentage, 100)}%` }}
                            />
                        </div>
                    )}

                    {/* Botões de ação */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadCacheData}
                            disabled={loading}
                            className="flex-1"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Atualizar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClearCache}
                            disabled={clearing || cachedPdfs.length === 0}
                            className="flex-1"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {clearing ? 'Limpando...' : 'Limpar Tudo'}
                        </Button>
                    </div>

                    {/* Lista de PDFs */}
                    <div className="flex-1 overflow-y-auto border rounded-lg">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-gray-400" />
                                <p>Carregando...</p>
                            </div>
                        ) : cachedPdfs.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Database className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                <p className="font-medium">Nenhum PDF no cache</p>
                                <p className="text-sm mt-1">Faça upload de PDFs para acessá-los offline</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {cachedPdfs.map((pdf) => (
                                    <div
                                        key={pdf.id}
                                        className="p-4 hover:bg-gray-50 transition-colors flex items-center gap-4"
                                    >
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {pdf.nome}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <HardDrive className="h-3 w-3" />
                                                    {formatBytes(pdf.size)}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(pdf.timestamp)}
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemovePdf(pdf.id, pdf.nome)}
                                            className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
