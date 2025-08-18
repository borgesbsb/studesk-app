"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listarDisciplinasDoConcurso, removerDisciplinaDoConcurso } from "@/interface/actions/disciplina/concurso"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Book, Trash2 } from "lucide-react"

interface DisciplinasTableProps {
  concursoId: string
}

interface DisciplinaConcurso {
  id: string
  concursoId: string
  disciplinaId: string
  ordem: number
  peso: number
  questoes: number
  pontos: number
  disciplina: {
    id: string
    nome: string
  }
}

interface MaterialEstudo {
  id: string
  nome: string
  totalPaginas: number
  paginasLidas: number
  arquivoPdfUrl?: string | null
}

interface DisciplinaComMateriais extends DisciplinaConcurso {
  materiais: MaterialEstudo[]
  progresso: number
  totalPaginas: number
  paginasLidas: number
}

export function DisciplinasTable({ concursoId }: DisciplinasTableProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [disciplinas, setDisciplinas] = useState<DisciplinaComMateriais[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await listarDisciplinasDoConcurso(concursoId)
        if (response.success && response.data) {
          const disciplinasComMateriais = await Promise.all(
            response.data.map(async (disc) => {
              const materiaisResponse = await listarMateriaisDaDisciplina(disc.disciplinaId)
              const materiais = materiaisResponse.success ? materiaisResponse.data?.map(dm => dm.material) || [] : []

              const totalPaginas = materiais.reduce((total, mat) => total + mat.totalPaginas, 0)
              const paginasLidas = materiais.reduce((total, mat) => total + mat.paginasLidas, 0)
              const progresso = totalPaginas > 0 ? (paginasLidas / totalPaginas) * 100 : 0

              return {
                ...disc,
                materiais,
                progresso,
                totalPaginas,
                paginasLidas,
              }
            })
          )
          setDisciplinas(disciplinasComMateriais)
        }
      } catch (error) {
        toast({
          title: "Erro ao carregar disciplinas",
          description: "Ocorreu um erro ao carregar as disciplinas e materiais.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [concursoId, toast])

  const handleRemover = async (disciplinaId: string) => {
    if (!confirm("Tem certeza que deseja remover esta disciplina?")) {
      return
    }

    const response = await removerDisciplinaDoConcurso(concursoId, disciplinaId)
    if (response.success) {
      toast({
        title: "Disciplina removida com sucesso",
        description: "A disciplina foi removida do concurso.",
      })
      window.location.reload()
    } else {
      toast({
        title: "Erro ao remover disciplina",
        description: response.error || "Ocorreu um erro ao remover a disciplina.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Peso</TableHead>
              <TableHead>Questões</TableHead>
              <TableHead>Materiais</TableHead>
              <TableHead>Páginas</TableHead>
              <TableHead>Progresso</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell>
                  <Skeleton className="h-2 w-full" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-28 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Disciplina</TableHead>
            <TableHead>Peso</TableHead>
            <TableHead>Questões</TableHead>
            <TableHead>Materiais</TableHead>
            <TableHead>Páginas</TableHead>
            <TableHead>Progresso</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disciplinas.map((disciplina) => {
            const materiaisCount = disciplina.materiais.length
            const progresso = disciplina.progresso
            return (
              <TableRow key={disciplina.id}>
                <TableCell className="font-medium">{disciplina.disciplina.nome}</TableCell>
                <TableCell>{disciplina.peso}</TableCell>
                <TableCell>{disciplina.questoes}</TableCell>
                <TableCell>{materiaisCount}</TableCell>
                <TableCell>
                  {disciplina.paginasLidas} / {disciplina.totalPaginas}
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Progress value={progresso} className="h-2" />
                    <span className="text-xs text-gray-600 w-10 text-right">{Math.round(progresso)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/concurso/${concursoId}/disciplina/${disciplina.disciplinaId}/materiais`)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      title="Materiais de Estudo"
                    >
                      <Book className="h-4 w-4 mr-2" /> Materiais
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemover(disciplina.disciplinaId)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      title="Remover Disciplina"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Remover
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}

          {disciplinas.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                Nenhuma disciplina cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}