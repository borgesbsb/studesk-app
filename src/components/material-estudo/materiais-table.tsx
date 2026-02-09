"use client"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { FileText, Trash2, Video, Play, Eye, FileImage, BookOpen, X, ChevronLeft, ChevronRight } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { listarMateriaisPaginadosDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo, deletarMateriaisEmMassa } from "@/interface/actions/material-estudo/delete"
import { toast } from "sonner"
import { MaterialEstudo } from "@/domain/entities/MaterialEstudo"
import { MediaUploadDialog } from './media-upload-dialog'

interface MateriaisTableProps {
  disciplinaId: string
}

interface ProcessingStatus {
  hasProcessedPages: boolean
  processedPages: number
  totalPages: number
  progress: number
  status: 'pending' | 'processing' | 'partial' | 'complete' | 'error'
  processingError?: string | null
}

// Material enriquecido com dados do server-side
interface MaterialComTempo extends MaterialEstudo {
  tempoEstudadoSegundos: number
  mobileText?: {
    processedPages: number
    totalPages: number
    processingStatus: string
    processingError: string | null
    lastProcessedPage: number
  } | null
}

const ITEMS_PER_PAGE = 15

export function MateriaisTable({ disciplinaId }: MateriaisTableProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [loadingTab, setLoadingTab] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<MaterialEstudo | null>(null)
  const [activeTab, setActiveTab] = useState<'pdf' | 'video'>('pdf')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)

  // Server-side paginated data
  const [materiaisPdf, setMateriaisPdf] = useState<MaterialComTempo[]>([])
  const [materiaisVideo, setMateriaisVideo] = useState<MaterialComTempo[]>([])
  const [totalPdfs, setTotalPdfs] = useState(0)
  const [totalVideos, setTotalVideos] = useState(0)
  const [totalPagesPdf, setTotalPagesPdf] = useState(1)
  const [totalPagesVideo, setTotalPagesVideo] = useState(1)
  const [paginaPdfs, setPaginaPdfs] = useState(1)
  const [paginaVideos, setPaginaVideos] = useState(1)

  const userHash = session?.user?.hash

  const carregarPagina = useCallback(async (tipo: 'PDF' | 'VIDEO', page: number, isInitial = false) => {
    if (!isInitial) setLoadingTab(true)
    try {
      const response = await listarMateriaisPaginadosDaDisciplina(disciplinaId, tipo, page, ITEMS_PER_PAGE)
      if (response.success && response.data) {
        const items = response.data as MaterialComTempo[]
        if (tipo === 'PDF') {
          setMateriaisPdf(items)
          setTotalPdfs(response.pagination.total)
          setTotalPagesPdf(response.pagination.pages)
        } else {
          setMateriaisVideo(items)
          setTotalVideos(response.pagination.total)
          setTotalPagesVideo(response.pagination.pages)
        }
      } else {
        toast.error(response.error || 'Erro ao carregar materiais')
      }
    } catch (error) {
      console.error('Erro ao carregar materiais:', error)
      toast.error('Erro ao carregar materiais')
    } finally {
      if (isInitial) setLoading(false)
      setLoadingTab(false)
    }
  }, [disciplinaId])

  // Carga inicial: ambas as abas
  useEffect(() => {
    const carregarInicial = async () => {
      setLoading(true)
      await Promise.all([
        carregarPagina('PDF', 1, true),
        carregarPagina('VIDEO', 1, true),
      ])
      setLoading(false)
    }
    carregarInicial()
  }, [disciplinaId, carregarPagina])

  // Recarregar quando a janela ganhar foco (usuário voltar do PDF/video)
  useEffect(() => {
    const handleFocus = () => {
      carregarPagina(activeTab === 'pdf' ? 'PDF' : 'VIDEO', activeTab === 'pdf' ? paginaPdfs : paginaVideos)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [disciplinaId, activeTab, paginaPdfs, paginaVideos, carregarPagina])

  // Recarregar ao mudar de página
  useEffect(() => {
    if (!loading) {
      carregarPagina('PDF', paginaPdfs)
    }
  }, [paginaPdfs])

  useEffect(() => {
    if (!loading) {
      carregarPagina('VIDEO', paginaVideos)
    }
  }, [paginaVideos])

  // Polling leve para PDFs em processamento (só na página atual)
  useEffect(() => {
    if (activeTab !== 'pdf') return

    const temProcessamento = materiaisPdf.some(m =>
      m.mobileText && (m.mobileText.processingStatus === 'processing' || m.mobileText.processingStatus === 'partial')
    )
    if (!temProcessamento) return

    const interval = setInterval(() => {
      carregarPagina('PDF', paginaPdfs)
    }, 5000)

    return () => clearInterval(interval)
  }, [activeTab, materiaisPdf, paginaPdfs, carregarPagina])

  const formatarTempo = (segundosTotais: number): string => {
    const horas = Math.floor(segundosTotais / 3600)
    const minutos = Math.floor((segundosTotais % 3600) / 60)
    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await deletarMaterialEstudo(id)
      if (response.success) {
        toast.success('Material excluído com sucesso!')
        // Recarregar a aba atual
        if (activeTab === 'pdf') {
          await carregarPagina('PDF', paginaPdfs)
        } else {
          await carregarPagina('VIDEO', paginaVideos)
        }
      } else {
        toast.error(response.error || 'Erro ao excluir material')
      }
    } catch (error) {
      console.error('Erro ao excluir material:', error)
      toast.error('Erro ao excluir material')
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = (materiaisList: MaterialComTempo[]) => {
    const allIds = materiaisList.map(m => m.id)
    const allSelected = allIds.every(id => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        allIds.forEach(id => next.add(id))
        return next
      })
    }
  }

  const handleBulkDelete = async () => {
    const count = selectedIds.size
    if (!count) return
    if (!confirm(`Deseja realmente excluir ${count} material(is) selecionado(s)?`)) return

    setDeletingBulk(true)
    try {
      const response = await deletarMateriaisEmMassa(Array.from(selectedIds))
      if (response.success) {
        toast.success(`${count} material(is) excluído(s) com sucesso!`)
        setSelectedIds(new Set())
        if (activeTab === 'pdf') {
          await carregarPagina('PDF', paginaPdfs)
        } else {
          await carregarPagina('VIDEO', paginaVideos)
        }
      } else {
        toast.error(response.error || 'Erro ao excluir materiais')
      }
    } catch (error) {
      console.error('Erro ao excluir materiais em massa:', error)
      toast.error('Erro ao excluir materiais')
    } finally {
      setDeletingBulk(false)
    }
  }

  const handleOpenPdf = (material: MaterialComTempo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    if (material.tipo === 'VIDEO') {
      window.location.href = `/${userHash}/material/${material.id}/video?disciplinaId=${disciplinaId}`
    } else {
      window.location.href = `/${userHash}/material/${material.id}/ler?disciplinaId=${disciplinaId}`
    }
  }

  const handleOpenTexto = async (material: MaterialComTempo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }

    // Usar dados do mobileText que já vieram do server
    const mt = material.mobileText
    if (!mt || mt.processedPages === 0) {
      if (!mt || mt.processingStatus === 'pending') {
        toast.info('Processamento ainda não foi iniciado. Aguarde alguns instantes.')
      } else if (mt?.processingStatus === 'processing') {
        toast.info(`Processamento em andamento: ${mt.processedPages} de ${mt.totalPages} páginas prontas.`)
      } else if (mt?.processingStatus === 'error') {
        toast.error(`Erro no processamento: ${mt.processingError || 'Erro desconhecido'}`)
      } else {
        toast.warning('Nenhuma página disponível ainda.')
      }
      return
    }

    if (mt.processingStatus === 'processing' || mt.processingStatus === 'partial') {
      toast.success(`${mt.processedPages} de ${mt.totalPages} páginas prontas. Abrindo leitor...`)
    }

    window.location.href = `/${userHash}/material/${material.id}/ler?mode=text&disciplinaId=${disciplinaId}`
  }

  const handleOpenPdfOriginal = (material: MaterialComTempo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    window.location.href = `/${userHash}/material/${material.id}/ler?mode=pdf&disciplinaId=${disciplinaId}`
  }

  const handleUploadComplete = (fileUrl: string, mediaType: 'PDF' | 'VIDEO') => {
    if (!pendingMaterial) return
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    if (mediaType === 'PDF') {
      window.location.href = `/${userHash}/material/${pendingMaterial.id}/ler?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`
    } else {
      window.location.href = `/${userHash}/material/${pendingMaterial.id}/video?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`
    }
    setPendingMaterial(null)
    setShowUploadDialog(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          Carregando materiais...
        </div>
      </div>
    )
  }

  // Componente de tabela e cards reutilizável
  const renderTable = (
    materiais: MaterialComTempo[],
    tipo: 'PDF' | 'VIDEO',
    paginaAtual: number,
    setPaginaAtual: (p: number | ((prev: number) => number)) => void,
    totalItems: number,
    totalPaginas: number
  ) => {
    if (totalItems === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          Nenhum {tipo === 'PDF' ? 'PDF' : 'vídeo'} cadastrado
        </div>
      )
    }

    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE
    const fim = Math.min(inicio + materiais.length, totalItems)

    const allIds = materiais.map(m => m.id)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))
    const someSelected = allIds.some(id => selectedIds.has(id))

    return (
      <>
        {loadingTab && (
          <div className="flex items-center justify-center py-4">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        )}

        {/* Mobile: Cards */}
        <div className={`md:hidden space-y-3 ${loadingTab ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Selecionar todos - mobile */}
          <div className="flex items-center gap-2 px-1">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => toggleSelectAll(materiais)}
              className="h-4 w-4"
            />
            <span className="text-xs text-muted-foreground">Selecionar todos</span>
          </div>
          {materiais.map((material) => {
            const tempoEstudadoSegundos = material.tempoEstudadoSegundos ?? 0
            const tempoVideoAssistido = tipo === 'VIDEO' ? (material.tempoAssistido || 0) : 0
            const progresso = tipo === 'VIDEO'
              ? Math.min(100, (tempoVideoAssistido / (material.duracaoSegundos || 1)) * 100)
              : (material.paginasLidas / material.totalPaginas) * 100
            const processingStatus = tipo === 'PDF' && material.mobileText ? {
              hasProcessedPages: (material.mobileText.processedPages || 0) > 0,
              processedPages: material.mobileText.processedPages || 0,
              totalPages: material.mobileText.totalPages || 0,
              progress: material.mobileText.totalPages > 0 ? Math.round((material.mobileText.processedPages / material.mobileText.totalPages) * 100) : 0,
              status: material.mobileText.processingStatus as ProcessingStatus['status'],
            } as ProcessingStatus : null

            return (
              <div key={material.id} className={`border rounded-lg p-4 bg-card ${selectedIds.has(material.id) ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}>
                {/* Header do Card */}
                <div className="flex items-start gap-2 mb-3">
                  <Checkbox
                    checked={selectedIds.has(material.id)}
                    onCheckedChange={() => toggleSelect(material.id)}
                    className="h-4 w-4 mt-0.5 flex-shrink-0"
                  />
                  {tipo === 'VIDEO' ? (
                    <Video className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <FileText className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <h3 className="font-medium text-sm flex-1">{material.nome}</h3>
                </div>

                {/* Progresso */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progresso</span>
                    <span className="font-medium">{Math.round(progresso)}%</span>
                  </div>
                  <Progress value={progresso} className="h-2" />
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">{tipo === 'PDF' ? 'Páginas' : 'Duração'}</p>
                    <p className="font-medium">
                      {tipo === 'VIDEO' ? (
                        <span>
                          {Math.floor(tempoVideoAssistido / 60)}m / {Math.floor((material.duracaoSegundos || 0) / 60)}m
                        </span>
                      ) : (
                        <span>
                          {material.paginasLidas} / {material.totalPaginas}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground mb-1">Tempo Estudado</p>
                    <p className="font-medium">{formatarTempo(tempoEstudadoSegundos)}</p>
                  </div>
                </div>

                {/* Status de Processamento IA (apenas para PDF) */}
                {tipo === 'PDF' && processingStatus && (
                  <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-2">
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">Formatação com IA</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      {processingStatus.status === 'complete'
                        ? `Concluído - ${processingStatus.totalPages} páginas formatadas (100%)`
                        : processingStatus.status === 'processing' || processingStatus.status === 'partial'
                        ? `Processando - ${processingStatus.processedPages}/${processingStatus.totalPages} páginas (${processingStatus.progress}%)`
                        : processingStatus.status === 'error'
                        ? `Erro no processamento`
                        : `Aguardando início do processamento`
                      }
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  {tipo === 'PDF' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenTexto(material)}
                        disabled={!processingStatus?.hasProcessedPages}
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!processingStatus?.hasProcessedPages ? 'Texto ainda não processado' : 'Abrir texto'}
                      >
                        <BookOpen className="h-4 w-4 mr-1" />
                        Texto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPdfOriginal(material)}
                        className="flex-1 border-purple-200 text-purple-600 hover:bg-purple-50"
                      >
                        <FileImage className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPdf(material)}
                      className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Abrir
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Deseja realmente excluir "${material.nome}"?`)) {
                        handleDelete(material.id)
                      }
                    }}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop: Tabela */}
        <div className={`hidden md:block rounded-md border overflow-hidden ${loadingTab ? 'opacity-50 pointer-events-none' : ''}`}>
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[40px] py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleSelectAll(materiais)}
                  className="h-3.5 w-3.5"
                  ref={(el) => {
                    if (el) (el as HTMLInputElement).indeterminate = someSelected && !allSelected
                  }}
                />
              </TableHead>
              <TableHead className={`${tipo === 'PDF' ? 'w-[45%]' : 'w-[30%]'} py-2 text-xs`}>Nome</TableHead>
              <TableHead className={`${tipo === 'PDF' ? 'w-[25%]' : 'w-[15%]'} py-2 text-xs`}>Progresso</TableHead>
              {tipo === 'VIDEO' && <TableHead className="w-[15%] py-2 text-xs">Duração</TableHead>}
              <TableHead className={`${tipo === 'PDF' ? 'w-[25%]' : 'w-[20%]'} py-2 text-xs text-right`}>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiais.map((material) => {
              const tempoEstudadoSegundos = material.tempoEstudadoSegundos ?? 0
              const tempoVideoAssistido = tipo === 'VIDEO' ? (material.tempoAssistido || 0) : 0
              const progresso = tipo === 'VIDEO'
                ? Math.min(100, (tempoVideoAssistido / (material.duracaoSegundos || 1)) * 100)
                : (material.paginasLidas / material.totalPaginas) * 100
              const processingStatus = tipo === 'PDF' && material.mobileText ? {
                hasProcessedPages: (material.mobileText.processedPages || 0) > 0,
                processedPages: material.mobileText.processedPages || 0,
                totalPages: material.mobileText.totalPages || 0,
                progress: material.mobileText.totalPages > 0 ? Math.round((material.mobileText.processedPages / material.mobileText.totalPages) * 100) : 0,
                status: material.mobileText.processingStatus as ProcessingStatus['status'],
              } as ProcessingStatus : null

              return (
                <TableRow key={material.id} className={`group hover:bg-muted/50 ${selectedIds.has(material.id) ? 'bg-blue-50' : ''}`}>
                  <TableCell className="py-2">
                    <Checkbox
                      checked={selectedIds.has(material.id)}
                      onCheckedChange={() => toggleSelect(material.id)}
                      className="h-3.5 w-3.5"
                    />
                  </TableCell>
                  <TableCell className="py-2 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      {tipo === 'VIDEO' ? (
                        <Video className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-red-600 flex-shrink-0" />
                      )}
                      <span className="truncate" title={material.nome}>
                        {material.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Progress value={progresso} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground min-w-[35px] text-right">
                        {Math.round(progresso)}%
                      </span>
                    </div>
                  </TableCell>
                  {tipo === 'VIDEO' && (
                    <TableCell className="py-2 text-xs text-muted-foreground">
                      <span>
                        {Math.floor(tempoVideoAssistido / 60)}m / {Math.floor((material.duracaoSegundos || 0) / 60)}m
                      </span>
                    </TableCell>
                  )}
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {tipo === 'PDF' ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenTexto(material)}
                                disabled={!processingStatus?.hasProcessedPages}
                                className="h-6 px-1.5 text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <BookOpen className="h-3 w-3 mr-0.5" />
                                Texto
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {processingStatus ? (
                                processingStatus.status === 'complete'
                                  ? `Formatação IA: ${processingStatus.totalPages} páginas (100%)`
                                  : processingStatus.status === 'processing' || processingStatus.status === 'partial'
                                  ? `Formatação IA: ${processingStatus.processedPages}/${processingStatus.totalPages} páginas (${processingStatus.progress}%)`
                                  : processingStatus.status === 'error'
                                  ? 'Erro na formatação IA'
                                  : 'Aguardando processamento IA'
                              ) : 'Texto ainda não processado'}
                            </TooltipContent>
                          </Tooltip>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPdfOriginal(material)}
                            className="h-6 px-1.5 text-xs hover:bg-purple-50 hover:text-purple-600"
                          >
                            <FileImage className="h-3 w-3 mr-0.5" />
                            PDF
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenPdf(material)}
                          className="h-6 px-1.5 text-xs hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye className="h-3 w-3 mr-0.5" />
                          Abrir
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir "${material.nome}"?`)) {
                            handleDelete(material.id)
                          }
                        }}
                        className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex flex-col items-center gap-2 mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev: number) => Math.max(1, prev - 1))}
                disabled={paginaAtual === 1 || loadingTab}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm px-3 py-1 bg-muted text-foreground rounded">
                {paginaAtual} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual((prev: number) => Math.min(totalPaginas, prev + 1))}
                disabled={paginaAtual === totalPaginas || loadingTab}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              Mostrando {inicio + 1}-{fim} de {totalItems}
            </span>
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'pdf' | 'video'); setSelectedIds(new Set()) }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="flex items-center gap-2 text-xs">
            <FileText className="h-3 w-3" />
            PDFs ({totalPdfs})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2 text-xs">
            <Video className="h-3 w-3" />
            Vídeos ({totalVideos})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-2">
          {renderTable(materiaisPdf, 'PDF', paginaPdfs, setPaginaPdfs, totalPdfs, totalPagesPdf)}
        </TabsContent>

        <TabsContent value="video" className="mt-2">
          {renderTable(materiaisVideo, 'VIDEO', paginaVideos, setPaginaVideos, totalVideos, totalPagesVideo)}
        </TabsContent>
      </Tabs>

      {/* Barra de ações em massa */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-lg shadow-lg px-4 py-2.5 flex items-center gap-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="w-px h-5 bg-gray-600" />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBulkDelete}
            disabled={deletingBulk}
            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/50"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {deletingBulk ? 'Excluindo...' : 'Excluir'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="h-7 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      {/* Diálogo de upload de mídia (PDF ou Vídeo) */}
      <MediaUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={handleUploadComplete}
        materialId={pendingMaterial?.id}
        materialNome={pendingMaterial?.nome}
        mediaType={(pendingMaterial?.tipo === 'VIDEO' ? 'VIDEO' : 'PDF') as 'PDF' | 'VIDEO'}
      />
    </div>
  )
}
