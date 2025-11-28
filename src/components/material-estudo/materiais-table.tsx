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
import { Progress } from "@/components/ui/progress"
import { FileText, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo } from "@/interface/actions/material-estudo/delete"
import { atualizarProgressoLeitura } from "@/interface/actions/material-estudo/update"
import { toast } from "sonner"
import { MaterialEstudo } from "@/domain/entities/MaterialEstudo"
import dynamic from 'next/dynamic'

const WebViewerPdfModal = dynamic(() => import('./webviewer-clean'), {
  ssr: false,
})

import { PdfSourceDialog } from './pdf-source-dialog'
import { PdfUploadDialog } from './pdf-upload-dialog'

interface MateriaisTableProps {
  disciplinaId: string
}

export function MateriaisTable({ disciplinaId }: MateriaisTableProps) {
  const [materiais, setMateriais] = useState<MaterialEstudo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialEstudo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [atualizandoProgresso, setAtualizandoProgresso] = useState(false)
  const [horasPorMaterialSegundos, setHorasPorMaterialSegundos] = useState<Record<string, number>>({})
  const [showPdfSourceDialog, setShowPdfSourceDialog] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<MaterialEstudo | null>(null)

  useEffect(() => {
    carregarMateriais()
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

  const formatarTempo = (segundosTotais: number): string => {
    const horas = Math.floor(segundosTotais / 3600)
    const minutos = Math.floor((segundosTotais % 3600) / 60)
    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }

  // Listener para abrir modal de visualização
  useEffect(() => {
    const handleOpenModal = (event: any) => {
      setSelectedMaterial(event.detail.material)
      setIsModalOpen(true)
    }

    // Listener para gerenciar assuntos estudados
    const handleOpenAssuntos = (event: any) => {
      setSelectedMaterial(event.detail.material)
      setIsModalOpen(true) // Assuming assuntos modal is also a PDF modal
    }

    window.addEventListener('openPdfModal', handleOpenModal)
    window.addEventListener('openAssuntosModal', handleOpenAssuntos)

    return () => {
      window.removeEventListener('openPdfModal', handleOpenModal)
      window.removeEventListener('openAssuntosModal', handleOpenAssuntos)
    }
  }, [])

  const carregarMateriais = async () => {
    try {
      const response = await listarMateriaisDaDisciplina(disciplinaId)
      if (response.success && response.data) {
        const materiaisData = response.data.map((dm) => ({
          id: dm.material.id,
          nome: dm.material.nome,
          totalPaginas: dm.material.totalPaginas,
          paginasLidas: dm.material.paginasLidas,
          arquivoPdfUrl: dm.material.arquivoPdfUrl || '',
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

  const handleProgressUpdate = async (id: string, paginasLidas: number) => {
    try {
      const response = await atualizarProgressoLeitura(id, paginasLidas)
      if (response.success) {
        toast.success("Progresso atualizado com sucesso!")
        carregarMateriais()
      } else {
        toast.error(response.error || "Erro ao atualizar progresso")
      }
    } catch (error) {
      toast.error("Erro ao atualizar progresso")
    }
  }

  const handleAtualizarProgresso = async (pagina: number) => {
    if (!selectedMaterial) return

    try {
      await handleProgressUpdate(selectedMaterial.id, pagina)
    } catch (error) {
      console.error('Erro ao atualizar progresso:', error)
    }
  }

  const handleOpenPdf = (material: MaterialEstudo) => {
    if (material.arquivoPdfUrl) {
      setSelectedMaterial(material)
      setIsModalOpen(true)
    }
  }

  const handleOpenPoc2 = (material: MaterialEstudo) => {
    setPendingMaterial(material)
    setShowPdfSourceDialog(true)
  }

  const handlePdfSourceSelect = (source: 'local' | 'drive') => {
    if (!pendingMaterial) return

    if (source === 'local') {
      // Abrir diálogo de upload
      setShowUploadDialog(true)
    } else if (source === 'drive') {
      // TODO: Implementar integração com Google Drive
      toast.info('Integração com Google Drive em desenvolvimento', {
        description: 'Esta funcionalidade estará disponível em breve!'
      })
      setPendingMaterial(null)
    }
  }

  const handleUploadComplete = (fileUrl: string) => {
    if (!pendingMaterial) return

    // Redirecionar para Syncfusion com URL temporária e disciplinaId
    window.location.href = `/material/${pendingMaterial.id}/syncfusion?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`

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

  return (
    <div className="space-y-4">
      {materiais.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Nenhum material de estudo cadastrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {materiais.map((material) => {
            const progresso = (material.paginasLidas / material.totalPaginas) * 100
            return (
              <div
                key={material.id}
                className="group border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
                onClick={() => handleOpenPdf(material)}
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1" title={material.nome}>
                      {material.nome}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                      <FileText className="h-3 w-3" />
                      <span>{material.paginasLidas}/{material.totalPaginas} páginas</span>
                    </div>
                  </div>

                  {/* Botões de ação */}
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(material.id)
                      }}
                      title="Excluir material"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Botões de Visualização - Sempre visíveis */}
                <div className="flex gap-2 mb-4">
                  <Link
                    href={`/material/${material.id}/syncfusion?disciplinaId=${disciplinaId}`}
                    className="flex-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs h-8 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 font-medium shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      POC 2
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleOpenPoc2(material)
                    }}
                    title="Escolher fonte do PDF (Upload, Google Drive, etc)"
                    className="flex-1 text-xs h-8 border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 hover:text-purple-800 font-medium shadow-sm"
                  >
                    <svg className="h-3.5 w-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Carregar
                  </Button>
                </div>

                {/* Pizza de Progresso Gigante */}
                <div className="flex flex-col items-center justify-center py-6">
                  <div className="relative w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      {/* Círculo de fundo */}
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-gray-200"
                      />
                      {/* Círculo de progresso */}
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - progresso / 100)}`}
                        className="text-primary transition-all duration-500"
                        strokeLinecap="round"
                      />
                    </svg>
                    {/* Porcentagem no centro */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900">
                        {Math.round(progresso)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total de Horas Estudadas */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Total estudado</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatarTempo(horasPorMaterialSegundos[material.id] ?? 0)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal PDF Normal */}
      {selectedMaterial && selectedMaterial.arquivoPdfUrl && (
        <WebViewerPdfModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          pdfUrl={selectedMaterial.arquivoPdfUrl}
          paginaProgresso={selectedMaterial.paginasLidas}
          onAtualizarProgresso={handleAtualizarProgresso}
          materialId={selectedMaterial.id}
        />
      )}

      {/* Diálogo de escolha de fonte PDF (POC 2) */}
      <PdfSourceDialog
        open={showPdfSourceDialog}
        onOpenChange={setShowPdfSourceDialog}
        onSelectSource={handlePdfSourceSelect}
        materialNome={pendingMaterial?.nome}
      />

      {/* Diálogo de upload de PDF */}
      <PdfUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={handleUploadComplete}
        materialId={pendingMaterial?.id}
        materialNome={pendingMaterial?.nome}
      />
    </div>
  )
} 