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
import { FileText, Video, Eye, FileImage, BookOpen, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { getUltimosMaterialAcessados, MaterialAcessadoRecente } from "@/interface/actions/dashboard/get-ultimos-materiais-acessados"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface UltimosMateriaisCardProps {
  disciplinaId: string
}

export function UltimosMateriaisCard({ disciplinaId }: UltimosMateriaisCardProps) {
  const { data: session } = useSession()
  const [materiais, setMateriais] = useState<MaterialAcessadoRecente[]>([])
  const [loading, setLoading] = useState(true)
  const [materiaisComTextoProcessado, setMateriaisComTextoProcessado] = useState<Record<string, boolean>>({})

  const userHash = session?.user?.hash

  useEffect(() => {
    carregarMateriais()
  }, [])

  // Recarregar quando a janela ganhar foco (usuário voltar do PDF)
  useEffect(() => {
    const handleFocus = () => {
      carregarMateriais()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Verificar quais materiais PDF têm texto processado
  useEffect(() => {
    const verificarTextoProcessado = async () => {
      try {
        const entries = await Promise.all(
          materiais
            .filter(mat => mat.tipo === 'PDF')
            .map(async (mat) => {
              try {
                const res = await fetch(`/api/pdf/${mat.id}/check-processed`)
                const data = await res.json()
                return [mat.id, data.hasProcessedPages || false] as const
              } catch (e) {
                console.error(`Erro ao verificar status do material ${mat.nome}:`, e)
                return [mat.id, false] as const
              }
            })
        )
        setMateriaisComTextoProcessado(Object.fromEntries(entries))
      } catch (e) {
        console.error('Erro ao verificar textos processados:', e)
      }
    }
    if (materiais.length > 0) {
      verificarTextoProcessado()
    } else {
      setMateriaisComTextoProcessado({})
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
      const materiaisData = await getUltimosMaterialAcessados(disciplinaId, 10)
      setMateriais(materiaisData)
    } catch (error) {
      console.error('Erro ao carregar últimos materiais:', error)
      toast.error('Erro ao carregar últimos materiais')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenTexto = async (material: MaterialAcessadoRecente) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }

    // Verificar se há páginas processadas antes de abrir
    try {
      const response = await fetch(`/api/pdf/${material.id}/check-processed`)
      const data = await response.json()

      if (!data.hasProcessedPages) {
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

      if (data.status === 'processing' || data.status === 'partial') {
        toast.success(`${data.processedPages} de ${data.totalPages} páginas prontas. Abrindo leitor...`)
      }

      window.location.href = `/${userHash}/material/${material.id}/ler?mode=text&disciplinaId=${disciplinaId}`
    } catch (error) {
      console.error('Erro ao verificar páginas processadas:', error)
      toast.error('Erro ao verificar status do processamento')
    }
  }

  const handleOpenPdfOriginal = (material: MaterialAcessadoRecente) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    window.location.href = `/${userHash}/material/${material.id}/ler?mode=pdf&disciplinaId=${disciplinaId}`
  }

  const handleOpenVideo = (material: MaterialAcessadoRecente) => {
    if (!userHash) {
      toast.error('Sessão não encontrada')
      return
    }
    window.location.href = `/${userHash}/material/${material.id}/video?disciplinaId=${disciplinaId}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground">
          Carregando últimos materiais...
        </div>
      </div>
    )
  }

  if (materiais.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>Nenhum material acessado recentemente</p>
      </div>
    )
  }

  return (
    <div>
      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {materiais.map((material) => {
          const progresso = material.percentualProgresso

          return (
            <div key={material.id} className="border rounded-lg p-4 bg-white">
              {/* Header do Card */}
              <div className="flex items-start gap-2 mb-3">
                {material.tipo === 'VIDEO' ? (
                  <Video className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <FileText className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{material.nome}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(material.ultimoAcesso), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                </div>
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
                {material.tipo === 'PDF' && (
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">Páginas</p>
                    <p className="font-medium">
                      {material.ultimaPagina} / {material.totalPaginas}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500 mb-1">Tempo Estudado</p>
                  <p className="font-medium">{formatarTempo(material.tempoTotalSegundos)}</p>
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2">
                {material.tipo === 'PDF' ? (
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
                    onClick={() => handleOpenVideo(material)}
                    className="flex-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Abrir
                  </Button>
                )}
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
              <TableHead className="w-[50%] py-2 text-xs">Nome</TableHead>
              <TableHead className="w-[20%] py-2 text-xs">Último Acesso</TableHead>
              <TableHead className="w-[15%] py-2 text-xs">Progresso</TableHead>
              <TableHead className="w-[15%] py-2 text-xs text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiais.map((material) => {
              const progresso = material.percentualProgresso

              return (
                <TableRow key={material.id} className="group hover:bg-muted/50">
                  <TableCell className="py-2 text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      {material.tipo === 'VIDEO' ? (
                        <Video className="h-3 w-3 text-purple-600 flex-shrink-0" />
                      ) : (
                        <FileText className="h-3 w-3 text-red-600 flex-shrink-0" />
                      )}
                      <span className="truncate" title={material.nome}>
                        {material.nome}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(material.ultimoAcesso), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5">
                      <Progress value={progresso} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium text-muted-foreground min-w-[35px] text-right">
                        {Math.round(progresso)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {material.tipo === 'PDF' ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenTexto(material)}
                            disabled={!materiaisComTextoProcessado[material.id]}
                            className="h-6 px-1.5 text-xs hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!materiaisComTextoProcessado[material.id] ? 'Texto ainda não processado' : 'Abrir texto'}
                          >
                            <BookOpen className="h-3 w-3 mr-0.5" />
                            Texto
                          </Button>
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
                          onClick={() => handleOpenVideo(material)}
                          className="h-6 px-1.5 text-xs hover:bg-blue-50 hover:text-blue-600"
                        >
                          <Eye className="h-3 w-3 mr-0.5" />
                          Abrir
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
