"use client"

import { Button } from "@/components/ui/button"
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
    <div className="space-y-2">
      {materiais.map((material) => {
        const progresso = material.percentualProgresso

        return (
          <div key={material.id} className="border border-border rounded-lg p-3 bg-card hover:bg-muted transition-colors">
            {/* Header */}
            <div className="flex items-start gap-2 mb-2">
              {material.tipo === 'VIDEO' ? (
                <Video className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              ) : (
                <FileText className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-xs truncate text-card-foreground" title={material.nome}>{material.nome}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(material.ultimoAcesso), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </p>
              </div>
            </div>

            {/* Progresso */}
            <div className="mb-2">
              <div className="flex items-center gap-1.5">
                <Progress value={progresso} className="h-1.5 flex-1" />
                <span className="text-[10px] font-medium text-muted-foreground min-w-[28px] text-right">
                  {Math.round(progresso)}%
                </span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-1">
              {material.tipo === 'PDF' ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenTexto(material)}
                    disabled={!materiaisComTextoProcessado[material.id]}
                    className="h-6 px-2 text-[10px] flex-1 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50"
                    title={!materiaisComTextoProcessado[material.id] ? 'Texto ainda não processado' : 'Abrir texto'}
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    Texto
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPdfOriginal(material)}
                    className="h-6 px-2 text-[10px] flex-1 hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    <FileImage className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenVideo(material)}
                  className="h-6 px-2 text-[10px] flex-1 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Abrir
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
