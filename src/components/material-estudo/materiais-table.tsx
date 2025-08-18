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
import { FileText, Pencil, Trash2, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { deletarMaterialEstudo } from "@/interface/actions/material-estudo/delete"
import { atualizarProgressoLeitura } from "@/interface/actions/material-estudo/update"
import { toast } from "sonner"
import { MaterialEstudo, DisciplinaMaterial } from "@/domain/entities/MaterialEstudo"
import WebViewerPdfModal from './webviewer-clean'

interface MateriaisTableProps {
  disciplinaId: string
}

export function MateriaisTable({ disciplinaId }: MateriaisTableProps) {
  const router = useRouter()
  const [materiais, setMateriais] = useState<MaterialEstudo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialEstudo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [atualizandoProgresso, setAtualizandoProgresso] = useState(false)
  const [horasPorMaterialSegundos, setHorasPorMaterialSegundos] = useState<Record<string, number>>({})

  useEffect(() => {
    carregarMateriais()
  }, [disciplinaId])

  // Após carregar materiais, buscar horas estudadas por sessões para cada material
  useEffect(() => {
    const carregarHorasPorMaterial = async () => {
      try {
        const entries = await Promise.all(
          materiais.map(async (mat) => {
            try {
              const res = await fetch(`/api/material/${mat.id}/sessoes-estudo`)
              const data = await res.json()
              if (data?.success && Array.isArray(data.sessoesEstudo)) {
                const totalSegundos = data.sessoesEstudo.reduce(
                  (acc: number, sessao: any) => acc + (sessao.totalTempoSegundos || 0),
                  0
                )
                return [mat.id, totalSegundos] as const
              }
            } catch (e) {
              // ignora erro individual, marca 0
            }
            return [mat.id, 0] as const
          })
        )
        setHorasPorMaterialSegundos(Object.fromEntries(entries))
      } catch (e) {
        // silencioso
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead>Horas Estudadas</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {materiais.map((material) => (
            <TableRow key={material.id}>
              <TableCell>{material.nome}</TableCell>
              <TableCell>
                <div className="space-y-2">
                  <Progress 
                    value={(material.paginasLidas / material.totalPaginas) * 100} 
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground">
                    {material.paginasLidas} de {material.totalPaginas} páginas
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {formatarTempo(horasPorMaterialSegundos[material.id] ?? 0)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => router.push(`/material/${material.id}`)}
                    className="bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Abrir Material
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(material.id)}
                    title="Excluir material"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {materiais.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                Nenhum material de estudo cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

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
    </div>
  )
} 