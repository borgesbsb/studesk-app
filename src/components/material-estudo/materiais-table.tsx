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
import { FileText, Trash2, Video, Play, Eye, FileImage, BookOpen, X } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo, deletarMateriaisEmMassa } from "@/interface/actions/material-estudo/delete"
import { atualizarProgressoLeitura } from "@/interface/actions/material-estudo/update"
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
}

export function MateriaisTable({ disciplinaId }: MateriaisTableProps) {
  const { data: session } = useSession()
  const [materiais, setMateriais] = useState<MaterialEstudo[]>([])
  const [loading, setLoading] = useState(true)
  const [horasPorMaterialSegundos, setHorasPorMaterialSegundos] = useState<Record<string, number>>({})
  const [materiaisComTextoProcessado, setMateriaisComTextoProcessado] = useState<Record<string, boolean>>({})
  const [statusProcessamento, setStatusProcessamento] = useState<Record<string, ProcessingStatus>>({})
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<MaterialEstudo | null>(null)
  const [activeTab, setActiveTab] = useState<'pdf' | 'video'>('pdf')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletingBulk, setDeletingBulk] = useState(false)

  const userHash = session?.user?.hash

  useEffect(() => {
    carregarMateriais()
  }, [disciplinaId])

  // Recarregar quando a janela ganhar foco (usuário voltar do PDF)
  useEffect(() => {
    const handleFocus = () => {
      carregarMateriais()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [disciplinaId])

  // Após carregar materiais, buscar horas estudadas TOTAIS (todas as sessões, organizadas ou não)
  useEffect(() => {
    const carregarHorasPorMaterial = async () => {
      try {
        const entries = await Promise.all(
          materiais.map(async (mat) => {
            try {
              // Buscar TODOS os registros de histórico de leitura para calcular tempo total real
              const res = await fetch(`/api/material/${mat.id}/tempo-total`)
              const data = await res.json()
              if (data?.success && typeof data.totalSegundos === 'number') {
                return [mat.id, data.totalSegundos] as const
              }
            } catch (e) {
              console.error(`Erro ao buscar tempo total do material ${mat.id}:`, e)
            }
            return [mat.id, 0] as const
          })
        )
        setHorasPorMaterialSegundos(Object.fromEntries(entries))
      } catch (e) {
        console.error('Erro ao carregar horas por material:', e)
      }
    }
    if (materiais.length > 0) {
      carregarHorasPorMaterial()
    } else {
      setHorasPorMaterialSegundos({})
    }
  }, [materiais])

  // Verificar quais materiais PDF têm texto processado
  useEffect(() => {
    const verificarTextoProcessado = async () => {
      try {
        console.log('\n📊 [STATUS CHECK] Verificando status de processamento dos PDFs...')

        const entries = await Promise.all(
          materiais
            .filter(mat => mat.tipo === 'PDF')
            .map(async (mat) => {
              try {
                const res = await fetch(`/api/pdf/${mat.id}/check-processed`)
                const data = await res.json()

                // Log do status individual
                if (data.status !== 'complete') {
                  console.log(`   📄 ${mat.nome}:`)
                  console.log(`      Status: ${data.status}`)
                  console.log(`      Progresso: ${data.processedPages}/${data.totalPages} páginas (${data.progress}%)`)

                  if (data.status === 'processing' || data.status === 'partial') {
                    console.log('      💡 DICA: Veja logs detalhados no TERMINAL DO SERVIDOR')
                  }
                }

                return {
                  id: mat.id,
                  hasProcessedPages: data.hasProcessedPages || false,
                  status: data
                }
              } catch (e) {
                console.error(`❌ Erro ao verificar status do material ${mat.nome}:`, e)
                return {
                  id: mat.id,
                  hasProcessedPages: false,
                  status: {
                    hasProcessedPages: false,
                    processedPages: 0,
                    totalPages: 0,
                    progress: 0,
                    status: 'pending' as const
                  }
                }
              }
            })
        )

        const processandoAtivo = entries.some(e =>
          e.status.status === 'processing' || e.status.status === 'partial'
        )

        if (processandoAtivo) {
          console.log('⏳ [PROCESSAMENTO ATIVO] Há PDFs sendo processados com IA')
          console.log('🔄 [AUTO-REFRESH] Status será atualizado automaticamente a cada 3 segundos')
        }

        setMateriaisComTextoProcessado(
          Object.fromEntries(entries.map(e => [e.id, e.hasProcessedPages]))
        )
        setStatusProcessamento(
          Object.fromEntries(entries.map(e => [e.id, e.status]))
        )
      } catch (e) {
        console.error('❌ Erro ao verificar textos processados:', e)
      }
    }
    if (materiais.length > 0) {
      verificarTextoProcessado()
    } else {
      setMateriaisComTextoProcessado({})
      setStatusProcessamento({})
    }
  }, [materiais])

  // Polling para atualizar status de PDFs em processamento
  useEffect(() => {
    // Verificar se há algum material em processamento
    const temProcessamento = Object.values(statusProcessamento).some(
      status => status.status === 'processing' || status.status === 'partial'
    )

    if (!temProcessamento) return

    console.log('🔄 [POLLING] Iniciando atualização automática do status...')

    // Atualizar a cada 3 segundos
    const interval = setInterval(async () => {
      try {
        const entries = await Promise.all(
          materiais
            .filter(mat => mat.tipo === 'PDF')
            .map(async (mat) => {
              try {
                const res = await fetch(`/api/pdf/${mat.id}/check-processed`)
                const data = await res.json()

                // Log apenas se houver mudança significativa
                const oldStatus = statusProcessamento[mat.id]
                if (oldStatus && oldStatus.processedPages !== data.processedPages) {
                  console.log(`📊 [UPDATE] ${mat.nome}: ${data.processedPages}/${data.totalPages} páginas (${data.progress}%)`)
                }

                return { id: mat.id, status: data }
              } catch (e) {
                return { id: mat.id, status: statusProcessamento[mat.id] }
              }
            })
        )

        const novoStatus = Object.fromEntries(entries.map(e => [e.id, e.status]))
        setStatusProcessamento(novoStatus)

        // Parar polling se todos completaram
        const todosCompletos = Object.values(novoStatus).every(
          status => status.status === 'complete' || status.status === 'error'
        )

        if (todosCompletos) {
          console.log('✅ [POLLING] Todos os processamentos concluídos! Parando atualização automática.')
        }

      } catch (e) {
        console.error('❌ [POLLING] Erro ao atualizar status:', e)
      }
    }, 3000) // 3 segundos

    return () => {
      console.log('🛑 [POLLING] Parando atualização automática')
      clearInterval(interval)
    }
  }, [statusProcessamento, materiais])

  const formatarTempo = (segundosTotais: number): string => {
    const horas = Math.floor(segundosTotais / 3600)
    const minutos = Math.floor((segundosTotais % 3600) / 60)
    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }


  const carregarMateriais = async () => {
    try {
      const response = await listarMateriaisDaDisciplina(disciplinaId)
      if (response.success && response.data) {
        const materiaisData = response.data.map((dm) => ({
          id: dm.material.id,
          nome: dm.material.nome,
          tipo: dm.material.tipo || 'PDF', // Fallback para PDF se não houver tipo
          totalPaginas: dm.material.totalPaginas,
          paginasLidas: dm.material.paginasLidas,
          duracaoSegundos: dm.material.duracaoSegundos,
          tempoAssistido: dm.material.tempoAssistido,
          arquivoPdfUrl: dm.material.arquivoPdfUrl || '',
          arquivoVideoUrl: dm.material.arquivoVideoUrl || null,
          createdAt: new Date(dm.material.createdAt).toISOString(),
          updatedAt: new Date(dm.material.updatedAt).toISOString()
        })) as MaterialEstudo[]
        setMateriais(materiaisData)
      } else {
        toast.error(response.error || 'Erro ao carregar materiais')
      }
    } catch (error) {
      console.error('Erro ao carregar materiais:', error)
      toast.error('Erro ao carregar materiais')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await deletarMaterialEstudo(id)
      if (response.success) {
        toast.success('Material excluído com sucesso!')
        await carregarMateriais()
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

  const toggleSelectAll = (materiaisList: MaterialEstudo[]) => {
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
        await carregarMateriais()
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

  const handleOpenPdf = (material: MaterialEstudo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }

    // Redirecionar para o visualizador correto baseado no tipo
    if (material.tipo === 'VIDEO') {
      window.location.href = `/${userHash}/material/${material.id}/video?disciplinaId=${disciplinaId}`
    } else {
      window.location.href = `/${userHash}/material/${material.id}/ler?disciplinaId=${disciplinaId}`
    }
  }

  const handleOpenTexto = async (material: MaterialEstudo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }

    // Verificar se há páginas processadas antes de abrir
    try {
      const response = await fetch(`/api/pdf/${material.id}/check-processed`)
      const data = await response.json()

      if (!data.hasProcessedPages) {
        // Nenhuma página processada ainda
        if (data.status === 'pending') {
          toast.info('Processamento ainda não foi iniciado. Aguarde alguns instantes.')
        } else if (data.status === 'processing') {
          toast.info(`Processamento em andamento: ${data.processedPages} de ${data.totalPages} páginas prontas. Tente novamente em instantes.`)
        } else if (data.status === 'error') {
          toast.error(`Erro no processamento: ${data.processingError || 'Erro desconhecido'}`)
        } else {
          toast.warning('Nenhuma página disponível ainda. Tente novamente em alguns instantes.')
        }
        return
      }

      // Há páginas processadas, pode abrir
      if (data.status === 'processing' || data.status === 'partial') {
        toast.success(`${data.processedPages} de ${data.totalPages} páginas prontas. Abrindo leitor...`)
      }

      window.location.href = `/${userHash}/material/${material.id}/ler?mode=text&disciplinaId=${disciplinaId}`
    } catch (error) {
      console.error('Erro ao verificar páginas processadas:', error)
      toast.error('Erro ao verificar status do processamento')
    }
  }

  const handleOpenPdfOriginal = (material: MaterialEstudo) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    window.location.href = `/${userHash}/material/${material.id}/ler?mode=pdf&disciplinaId=${disciplinaId}`
  }

  const handleUploadPdf = (material: MaterialEstudo) => {
    console.log('📤 Abrindo modal de upload para material:', {
      id: material.id,
      nome: material.nome,
      tipo: material.tipo
    })
    setPendingMaterial(material)
    setShowUploadDialog(true)
  }


  const handleUploadComplete = (fileUrl: string, mediaType: 'PDF' | 'VIDEO') => {
    if (!pendingMaterial) return

    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }

    if (mediaType === 'PDF') {
      // Redirecionar para leitor de PDF com URL temporária e disciplinaId
      window.location.href = `/${userHash}/material/${pendingMaterial.id}/ler?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`
    } else {
      // Redirecionar para visualizador de vídeo com URL temporária e disciplinaId
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

  // Separar materiais por tipo
  const materiaisPdf = materiais.filter(m => m.tipo === 'PDF')
  const materiaisVideo = materiais.filter(m => m.tipo === 'VIDEO')

  // Componente de tabela e cards reutilizável
  const renderTable = (materiais: MaterialEstudo[], tipo: 'PDF' | 'VIDEO') => {
    if (materiais.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          Nenhum {tipo === 'PDF' ? 'PDF' : 'vídeo'} cadastrado
        </div>
      )
    }

    const allIds = materiais.map(m => m.id)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))
    const someSelected = allIds.some(id => selectedIds.has(id))

    return (
      <>
        {/* Mobile: Cards */}
        <div className="md:hidden space-y-3">
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
            const tempoEstudadoSegundos = horasPorMaterialSegundos[material.id] ?? 0
            // Para vídeos: usar tempoAssistido (posição atual) ao invés de tempo total estudado
            const tempoVideoAssistido = tipo === 'VIDEO' ? (material.tempoAssistido || 0) : 0
            const progresso = tipo === 'VIDEO'
              ? Math.min(100, (tempoVideoAssistido / (material.duracaoSegundos || 1)) * 100)
              : (material.paginasLidas / material.totalPaginas) * 100
            const processingStatus = tipo === 'PDF' ? statusProcessamento[material.id] : null

            return (
              <div key={material.id} className={`border rounded-lg p-4 bg-white ${selectedIds.has(material.id) ? 'ring-2 ring-blue-500 border-blue-300' : ''}`}>
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
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progresso</span>
                    <span className="font-medium">{Math.round(progresso)}%</span>
                  </div>
                  <Progress value={progresso} className="h-2" />
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">{tipo === 'PDF' ? 'Páginas' : 'Duração'}</p>
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
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">Tempo Estudado</p>
                    <p className="font-medium">{formatarTempo(tempoEstudadoSegundos)}</p>
                  </div>
                </div>

                {/* Status de Processamento IA (apenas para PDF) */}
                {tipo === 'PDF' && processingStatus && (
                  <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-xs text-blue-700 font-medium mb-1">Formatação com IA</p>
                    <p className="text-xs text-blue-600">
                      {processingStatus.status === 'complete'
                        ? `✅ Concluído - ${processingStatus.totalPages} páginas formatadas (100%)`
                        : processingStatus.status === 'processing' || processingStatus.status === 'partial'
                        ? `⏳ Processando - ${processingStatus.processedPages}/${processingStatus.totalPages} páginas (${processingStatus.progress}%)`
                        : processingStatus.status === 'error'
                        ? `❌ Erro no processamento`
                        : `⏸️ Aguardando início do processamento`
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
                        disabled={!materiaisComTextoProcessado[material.id]}
                        className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!materiaisComTextoProcessado[material.id] ? 'Texto ainda não processado' : 'Abrir texto'}
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
        <div className="hidden md:block rounded-md border overflow-hidden">
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
              const tempoEstudadoSegundos = horasPorMaterialSegundos[material.id] ?? 0
              // Para vídeos: usar tempoAssistido (posição atual) ao invés de tempo total estudado
              const tempoVideoAssistido = tipo === 'VIDEO' ? (material.tempoAssistido || 0) : 0
              const progresso = tipo === 'VIDEO'
                ? Math.min(100, (tempoVideoAssistido / (material.duracaoSegundos || 1)) * 100)
                : (material.paginasLidas / material.totalPaginas) * 100
              const processingStatus = tipo === 'PDF' ? statusProcessamento[material.id] : null

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
                                disabled={!materiaisComTextoProcessado[material.id]}
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
      </>
    )
  }

  return (
    <div>
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'pdf' | 'video'); setSelectedIds(new Set()) }} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="flex items-center gap-2 text-xs">
            <FileText className="h-3 w-3" />
            PDFs ({materiaisPdf.length})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2 text-xs">
            <Video className="h-3 w-3" />
            Vídeos ({materiaisVideo.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-2">
          {renderTable(materiaisPdf, 'PDF')}
        </TabsContent>

        <TabsContent value="video" className="mt-2">
          {renderTable(materiaisVideo, 'VIDEO')}
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