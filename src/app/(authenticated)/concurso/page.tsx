"use client"

import { ConcursosGrid } from "@/components/concurso/concursos-grid"
import { useEffect, useState } from "react"
import { ConcursoForm } from "@/components/concurso/concurso-form"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { criarConcurso, CreateConcursoData } from "@/interface/actions/concurso/create"
import { atualizarConcurso, UpdateConcursoData } from "@/interface/actions/concurso/update"
import { deletarConcurso } from "@/interface/actions/concurso/delete"
import { listarConcursos } from "@/interface/actions/concurso/list"
import { Concurso } from "@/domain/entities/Concurso"

type EditingConcurso = {
  id: string
  nome?: string
  orgao?: string
  banca?: string
  cargo?: string
  editalUrl?: string
  imagemUrl?: string
  dataProva?: string
  inicioCurso?: string
}

export default function ConcursoPage() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingConcurso, setEditingConcurso] = useState<EditingConcurso | null>(null)
  const [concursos, setConcursos] = useState<Concurso[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadConcursos()
  }, [])

  const loadConcursos = async () => {
    setIsLoading(true)
    const result = await listarConcursos()
    if (result.success && result.data) {
      // Convertendo as datas de string para Date
      const concursosComDatas = result.data.map(concurso => ({
        ...concurso,
        dataProva: concurso.dataProva ? new Date(concurso.dataProva) : undefined,
        createdAt: new Date(concurso.createdAt),
        updatedAt: new Date(concurso.updatedAt),
      }))
      setConcursos(concursosComDatas)
    } else {
      toast.error("Erro ao carregar concursos", {
        description: result.error
      })
    }
    setIsLoading(false)
  }

  const handleEdit = (concurso: Concurso) => {
    setEditingConcurso({
      id: concurso.id,
      nome: concurso.nome,
      orgao: concurso.orgao,
      banca: concurso.banca,
      cargo: concurso.cargo,
      editalUrl: concurso.editalUrl || undefined,
      imagemUrl: concurso.imagemUrl || undefined,
      dataProva: concurso.dataProva ? concurso.dataProva.toISOString().split('T')[0] : undefined,
      inicioCurso: concurso.inicioCurso ? concurso.inicioCurso.toISOString().split('T')[0] : undefined,
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    const result = await deletarConcurso(id)
    if (result.success) {
      toast.success("Concurso excluído com sucesso")
      await loadConcursos()
    } else {
      toast.error("Erro ao excluir concurso", {
        description: result.error
      })
    }
  }

  const handleSubmit = async (data: CreateConcursoData | UpdateConcursoData) => {
    try {
      const result = editingConcurso
        ? await atualizarConcurso(editingConcurso.id, data)
        : await criarConcurso(data as CreateConcursoData)

      if (result.success) {
        toast.success(
          editingConcurso 
            ? "Concurso atualizado com sucesso"
            : "Concurso criado com sucesso"
        )
        setIsFormOpen(false)
        setEditingConcurso(null)
        await loadConcursos()
      } else {
        toast.error("Erro ao salvar concurso", {
          description: result.error
        })
      }
    } catch (error) {
      toast.error("Erro ao salvar concurso", {
        description: (error as Error).message
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Concursos</h1>
          <p className="text-muted-foreground">
            Gerencie os concursos que você está estudando
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Concurso
        </Button>
      </div>

      <ConcursosGrid 
        concursos={concursos}
        onEdit={handleEdit} 
        onDelete={handleDelete} 
      />

      <ConcursoForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingConcurso}
        onSubmit={handleSubmit}
      />
    </div>
  )
} 