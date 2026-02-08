"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listarDisciplinas } from "@/interface/actions/disciplina/list"
import { deletarDisciplina } from "@/interface/actions/disciplina/delete"
import { listarMateriaisDaDisciplina } from "@/interface/actions/material-estudo/disciplina"
import { useSaveStatus } from "@/contexts/save-status-context"
import { useUserHash } from "@/contexts/user-hash-context"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Book, Trash2, ChevronLeft, ChevronRight, AlertTriangle, Pencil } from "lucide-react"
import { EditarDisciplinaModal } from "./editar-disciplina-modal"

// Componente de progresso circular
function CircularProgress({ value, size = 48, strokeWidth = 4, className = "" }: {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Círculo de fundo */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Círculo de progresso */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-blue-600 transition-all duration-300"
        />
      </svg>
      {/* Texto no centro */}
      <span className="absolute text-xs font-semibold text-gray-700">
        {Math.round(value)}%
      </span>
    </div>
  )
}

interface DisciplinasTableProps {
  termoPesquisa?: string // Para filtrar disciplinas
}


interface MaterialEstudo {
  id: string
  nome: string
  tipo: 'PDF' | 'VIDEO'
  totalPaginas: number
  paginasLidas: number
  duracaoSegundos: number | null
  tempoAssistido: number | null
  arquivoPdfUrl?: string | null
  arquivoVideoUrl?: string | null
}

interface DisciplinaComMateriais {
  id: string
  disciplinaId: string
  disciplina: {
    id: string
    nome: string
    cor?: string
  }
  materiais: MaterialEstudo[]
  progresso: number
  totalPaginas: number
  paginasLidas: number
  progressoPdf: number
  progressoVideo: number
  totalDuracaoSegundos: number
  totalTempoAssistido: number
  totalPdfs: number
  pdfsConcluidos: number
  totalVideos: number
  videosConcluidos: number
}

export function DisciplinasTable({ termoPesquisa }: DisciplinasTableProps) {
  const { hash } = useUserHash()
  const { setSuccess, setError } = useSaveStatus()
  const router = useRouter()
  const [disciplinas, setDisciplinas] = useState<DisciplinaComMateriais[]>([])
  const [loading, setLoading] = useState(true)
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [disciplinaParaExcluir, setDisciplinaParaExcluir] = useState<DisciplinaComMateriais | null>(null)
  const [excluindoDisciplinaId, setExcluindoDisciplinaId] = useState<string | null>(null)
  const [disciplinaParaEditar, setDisciplinaParaEditar] = useState<any | null>(null)
  const [modalEditarAberto, setModalEditarAberto] = useState(false)
  const itensPorPagina = 10

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const response = await listarDisciplinas()
        let disciplinasData: any[] = []
        if (response.success && response.data) {
          // Converter formato das disciplinas para compatibilidade
          disciplinasData = response.data.map(disciplina => ({
            id: disciplina.id,
            disciplinaId: disciplina.id,
            disciplina: {
              id: disciplina.id,
              nome: disciplina.nome,
              descricao: disciplina.descricao,
              cor: disciplina.cor
            }
          }))
        }
        
        if (disciplinasData.length > 0) {
          const disciplinasComMateriais = await Promise.all(
            disciplinasData.map(async (disc) => {
              const materiaisResponse = await listarMateriaisDaDisciplina(disc.disciplinaId)
              const materiais = materiaisResponse.success ? materiaisResponse.data?.map(dm => dm.material) || [] : []

              // Separar materiais por tipo
              const materiaisPdf = materiais.filter(m => m.tipo === 'PDF')
              const materiaisVideo = materiais.filter(m => m.tipo === 'VIDEO')

              // Calcular progresso de PDFs
              const totalPaginas = materiaisPdf.reduce((total, mat) => total + mat.totalPaginas, 0)
              const paginasLidas = materiaisPdf.reduce((total, mat) => total + mat.paginasLidas, 0)
              const progressoPdf = totalPaginas > 0 ? (paginasLidas / totalPaginas) * 100 : 0
              const totalPdfs = materiaisPdf.length
              const pdfsConcluidos = materiaisPdf.filter(m => m.totalPaginas > 0 && m.paginasLidas >= m.totalPaginas).length

              // Calcular progresso de Vídeos
              const totalDuracaoSegundos = materiaisVideo.reduce((total, mat) => total + (mat.duracaoSegundos || 0), 0)
              const totalTempoAssistido = materiaisVideo.reduce((total, mat) => total + (mat.tempoAssistido || 0), 0)
              const progressoVideo = totalDuracaoSegundos > 0 ? (totalTempoAssistido / totalDuracaoSegundos) * 100 : 0
              const totalVideos = materiaisVideo.length
              const videosConcluidos = materiaisVideo.filter(m => (m.duracaoSegundos || 0) > 0 && (m.tempoAssistido || 0) >= (m.duracaoSegundos || 0)).length

              // Progresso geral (média ponderada se houver ambos os tipos)
              let progresso = 0
              if (materiaisPdf.length > 0 && materiaisVideo.length > 0) {
                progresso = (progressoPdf + progressoVideo) / 2
              } else if (materiaisPdf.length > 0) {
                progresso = progressoPdf
              } else if (materiaisVideo.length > 0) {
                progresso = progressoVideo
              }

              return {
                ...disc,
                materiais,
                progresso,
                totalPaginas,
                paginasLidas,
                progressoPdf,
                progressoVideo,
                totalDuracaoSegundos,
                totalTempoAssistido,
                totalPdfs,
                pdfsConcluidos,
                totalVideos,
                videosConcluidos,
              }
            })
          )
          setDisciplinas(disciplinasComMateriais)
        }
      } catch (error) {
        setError("Erro ao carregar disciplinas e materiais")
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [])

  // Filtrar disciplinas baseado no termo de pesquisa
  const disciplinasFiltradas = disciplinas.filter(disciplina =>
    disciplina.disciplina.nome.toLowerCase().includes((termoPesquisa || '').toLowerCase())
  )

  // Calcular paginação
  const totalPaginas = Math.ceil(disciplinasFiltradas.length / itensPorPagina)
  const indiceInicio = (paginaAtual - 1) * itensPorPagina
  const indiceFim = indiceInicio + itensPorPagina
  const disciplinasPaginadas = disciplinasFiltradas.slice(indiceInicio, indiceFim)

  // Reset página quando pesquisa muda
  useEffect(() => {
    setPaginaAtual(1)
  }, [termoPesquisa])

  const confirmarExclusaoDisciplina = async () => {
    if (!disciplinaParaExcluir) return

    try {
      setExcluindoDisciplinaId(disciplinaParaExcluir.id)
      
      const response = await deletarDisciplina(disciplinaParaExcluir.disciplinaId)
      if (response.success) {
        setSuccess()
        window.location.reload()
      } else {
        setError(response.error || "Erro ao excluir disciplina")
      }
      setDisciplinaParaExcluir(null)
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error)
      setError("Erro inesperado ao excluir disciplina")
    } finally {
      setExcluindoDisciplinaId(null)
    }
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Disciplina</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Materiais</TableHead>
              <TableHead>PDFs</TableHead>
              <TableHead>Vídeos</TableHead>
              <TableHead>Progresso Geral</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                <TableCell><Skeleton className="h-6 w-6 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell>
                  <Skeleton className="h-2 w-full" />
                </TableCell>
                <TableCell className="text-center">
                  <Skeleton className="h-8 w-28 mx-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Formatar tempo de vídeo
  const formatarTempo = (segundos: number): string => {
    const horas = Math.floor(segundos / 3600)
    const minutos = Math.floor((segundos % 3600) / 60)
    if (horas > 0) {
      return `${horas}h ${minutos}m`
    }
    return `${minutos}m`
  }

  return (
    <div className="w-full">
      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {disciplinasPaginadas.map((disciplina) => {
          const materiaisCount = disciplina.materiais.length
          const progresso = disciplina.progresso

          return (
            <div key={disciplina.id} className="border border-gray-300 rounded-lg bg-white shadow-sm p-4">
              {/* Header do Card */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300 flex-shrink-0"
                    style={{ backgroundColor: disciplina.disciplina.cor || '#94a3b8' }}
                    title={disciplina.disciplina.cor || 'Sem cor definida'}
                  />
                  <div>
                    <h3 className="font-semibold text-base">{disciplina.disciplina.nome}</h3>
                    <p className="text-sm text-gray-500">{materiaisCount} {materiaisCount === 1 ? 'material' : 'materiais'}</p>
                  </div>
                </div>
              </div>

              {/* Progresso Geral */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Progresso Geral</span>
                  <span className="font-medium">{Math.round(progresso)}%</span>
                </div>
                <Progress value={progresso} className="h-2" />
              </div>

              {/* Estatísticas em Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* PDFs */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">PDFs</p>
                  {disciplina.totalPdfs > 0 ? (
                    <div className="flex items-center gap-2">
                      <CircularProgress value={(disciplina.pdfsConcluidos / disciplina.totalPdfs) * 100} size={40} strokeWidth={4} />
                      <div className="text-xs text-gray-600">
                        <div>{disciplina.pdfsConcluidos}</div>
                        <div className="text-gray-400">/ {disciplina.totalPdfs}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>

                {/* Vídeos */}
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-2">Vídeos</p>
                  {disciplina.totalVideos > 0 ? (
                    <div className="flex items-center gap-2">
                      <CircularProgress value={(disciplina.videosConcluidos / disciplina.totalVideos) * 100} size={40} strokeWidth={4} />
                      <div className="text-xs text-gray-600">
                        <div>{disciplina.videosConcluidos}</div>
                        <div className="text-gray-400">/ {disciplina.totalVideos}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/${hash}/disciplina/${disciplina.disciplinaId}/materiais`)}
                  className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Book className="h-4 w-4 mr-2" />
                  Materiais
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDisciplinaParaEditar(disciplina.disciplina)
                    setModalEditarAberto(true)
                  }}
                  className="border-green-200 text-green-600 hover:bg-green-50"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisciplinaParaExcluir(disciplina)}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}

        {disciplinasFiltradas.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-10 border border-gray-300 rounded-lg bg-white">
            {termoPesquisa ? `Nenhuma disciplina encontrada para "${termoPesquisa}"` : 'Nenhuma disciplina cadastrada'}
          </div>
        )}
      </div>

      {/* Desktop: Tabela */}
      <div className="hidden md:block border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Disciplina</TableHead>
            <TableHead>Cor</TableHead>
            <TableHead>Materiais</TableHead>
            <TableHead>PDFs</TableHead>
            <TableHead>Vídeos</TableHead>
            <TableHead>Progresso Geral</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {disciplinasPaginadas.map((disciplina) => {
            const materiaisCount = disciplina.materiais.length
            const progresso = disciplina.progresso

            return (
              <TableRow key={disciplina.id}>
                <TableCell className="font-medium">{disciplina.disciplina.nome}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: disciplina.disciplina.cor || '#94a3b8' }}
                      title={disciplina.disciplina.cor || 'Sem cor definida'}
                    />
                  </div>
                </TableCell>
                <TableCell>{materiaisCount}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {disciplina.totalPdfs > 0 ? (
                      <>
                        <CircularProgress value={(disciplina.pdfsConcluidos / disciplina.totalPdfs) * 100} size={52} strokeWidth={5} />
                        <div className="text-sm text-gray-600">
                          {disciplina.pdfsConcluidos} / {disciplina.totalPdfs}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {disciplina.totalVideos > 0 ? (
                      <>
                        <CircularProgress value={(disciplina.videosConcluidos / disciplina.totalVideos) * 100} size={52} strokeWidth={5} />
                        <div className="text-sm text-gray-600">
                          {disciplina.videosConcluidos} / {disciplina.totalVideos}
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <Progress value={progresso} className="h-2" />
                    <span className="text-xs text-gray-600 w-10 text-right">{Math.round(progresso)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/${hash}/disciplina/${disciplina.disciplinaId}/materiais`)}
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      title="Materiais de Estudo"
                    >
                      <Book className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDisciplinaParaEditar(disciplina.disciplina)
                        setModalEditarAberto(true)
                      }}
                      className="border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
                      title="Editar Disciplina"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDisciplinaParaExcluir(disciplina)}
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                      title="Excluir Disciplina"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}

          {disciplinasFiltradas.length === 0 && !loading && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-500 py-10">
                {termoPesquisa ? `Nenhuma disciplina encontrada para "${termoPesquisa}"` : 'Nenhuma disciplina cadastrada'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {disciplinasFiltradas.length > itensPorPagina && (
        <div className="flex items-center justify-center mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
              disabled={paginaAtual === 1}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm px-3 py-1 bg-gray-100 rounded">
              {paginaAtual} de {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
              disabled={paginaAtual === totalPaginas}
              className="flex items-center gap-1"
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!disciplinaParaExcluir} onOpenChange={() => setDisciplinaParaExcluir(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Excluir Disciplina
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir permanentemente "{disciplinaParaExcluir?.disciplina.nome}"?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium mb-2">
                ⚠️ Esta ação é irreversível e irá:
              </p>
              <ul className="text-sm text-red-600 space-y-1">
                <li>• Excluir permanentemente a disciplina</li>
                <li>• Excluir todos os {disciplinaParaExcluir?.materiais.length || 0} materiais associados</li>
                <li>• Remover todo o progresso de estudos</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisciplinaParaExcluir(null)}
              disabled={excluindoDisciplinaId === disciplinaParaExcluir?.id}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusaoDisciplina}
              disabled={excluindoDisciplinaId === disciplinaParaExcluir?.id}
            >
              {excluindoDisciplinaId === disciplinaParaExcluir?.id ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <EditarDisciplinaModal
        disciplina={disciplinaParaEditar}
        open={modalEditarAberto}
        onOpenChange={setModalEditarAberto}
        onSuccess={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}