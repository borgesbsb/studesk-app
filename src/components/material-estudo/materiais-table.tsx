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
import { FileText, Trash2, Video, Play, Eye } from "lucide-react"
import Link from "next/link"
import { useState, useEffect } from "react"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo } from "@/interface/actions/material-estudo/delete"
import { atualizarProgressoLeitura } from "@/interface/actions/material-estudo/update"
import { toast } from "sonner"
import { MaterialEstudo } from "@/domain/entities/MaterialEstudo"
import { MediaUploadDialog } from './media-upload-dialog'

interface MateriaisTableProps {
  disciplinaId: string
}

export function MateriaisTable({ disciplinaId }: MateriaisTableProps) {
  const [materiais, setMateriais] = useState<MaterialEstudo[]>([])
  const [loading, setLoading] = useState(true)
  const [horasPorMaterialSegundos, setHorasPorMaterialSegundos] = useState<Record<string, number>>({})
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<MaterialEstudo | null>(null)
  const [activeTab, setActiveTab] = useState<'pdf' | 'video'>('pdf')

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


  const handleOpenPdf = (material: MaterialEstudo) => {
    // Redirecionar para o visualizador correto baseado no tipo
    if (material.tipo === 'VIDEO') {
      window.location.href = `/material/${material.id}/video?disciplinaId=${disciplinaId}`
    } else {
      window.location.href = `/material/${material.id}/syncfusion?disciplinaId=${disciplinaId}`
    }
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

    if (mediaType === 'PDF') {
      // Redirecionar para Syncfusion com URL temporária e disciplinaId
      window.location.href = `/material/${pendingMaterial.id}/syncfusion?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`
    } else {
      // Redirecionar para visualizador de vídeo com URL temporária e disciplinaId
      window.location.href = `/material/${pendingMaterial.id}/video?tempUrl=${encodeURIComponent(fileUrl)}&disciplinaId=${disciplinaId}`
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

  // Componente de tabela reutilizável
  const renderTable = (materiais: MaterialEstudo[], tipo: 'PDF' | 'VIDEO') => {
    if (materiais.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12">
          Nenhum {tipo === 'PDF' ? 'PDF' : 'vídeo'} cadastrado
        </div>
      )
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Nome</TableHead>
              <TableHead className="w-[15%]">Progresso</TableHead>
              <TableHead className="w-[15%]">{tipo === 'PDF' ? 'Páginas' : 'Duração'}</TableHead>
              <TableHead className="w-[15%]">Tempo Estudado</TableHead>
              <TableHead className="w-[15%] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiais.map((material) => {
              const tempoEstudadoSegundos = horasPorMaterialSegundos[material.id] ?? 0
              const progresso = tipo === 'VIDEO'
                ? Math.min(100, (tempoEstudadoSegundos / (material.duracaoSegundos || 1)) * 100)
                : (material.paginasLidas / material.totalPaginas) * 100

              return (
                <TableRow key={material.id} className="group hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {tipo === 'VIDEO' ? (
                        <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                      )}
                      <span className="truncate" title={material.nome}>
                        {material.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={progresso} className="h-2 flex-1" />
                      <span className="text-sm font-medium text-muted-foreground min-w-[45px] text-right">
                        {Math.round(progresso)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tipo === 'VIDEO' ? (
                      <span>
                        {Math.floor((material.tempoAssistido || 0) / 60)}m / {Math.floor((material.duracaoSegundos || 0) / 60)}m
                      </span>
                    ) : (
                      <span>
                        {material.paginasLidas} / {material.totalPaginas}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatarTempo(tempoEstudadoSegundos)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPdf(material)}
                        className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Abrir
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm(`Deseja realmente excluir "${material.nome}"?`)) {
                            handleDelete(material.id)
                          }
                        }}
                        className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pdf' | 'video')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDFs ({materiaisPdf.length})
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Vídeos ({materiaisVideo.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-4">
          {renderTable(materiaisPdf, 'PDF')}
        </TabsContent>

        <TabsContent value="video" className="mt-4">
          {renderTable(materiaisVideo, 'VIDEO')}
        </TabsContent>
      </Tabs>

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