"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle, Save } from "lucide-react"
import { useRouter } from "next/navigation"
import { AdicionarTempoCicloDialog } from "@/components/material-estudo/adicionar-tempo-ciclo-dialog"
import { videoCacheService } from "@/services/video-cache.service"
import { useHeader } from "@/contexts/header-context"
import { toast } from "sonner"

// Carregar VideoPlayer apenas no cliente
const VideoPlayer = dynamic(
    () => import("@/components/video/VideoPlayer"),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Carregando visualizador de vídeo...</p>
                </div>
            </div>
        )
    }
)

interface PageProps {
    params: Promise<{ id: string }>
}

export default function VideoViewerPage({ params }: PageProps) {
    const router = useRouter()
    const { setCustomContent, setTitle, setBackButton, setFullWidth } = useHeader()
    const [materialId, setMaterialId] = useState<string>("")
    const [material, setMaterial] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [disciplinaIdFromUrl, setDisciplinaIdFromUrl] = useState<string>("")
    const [videoBlobUrl, setVideoBlobUrl] = useState<string>("")
    const [fromCache, setFromCache] = useState<boolean>(false)

    // Estados do cronômetro
    const [elapsedTime, setElapsedTime] = useState(0) // em segundos
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [timerInitialized, setTimerInitialized] = useState(false)
    const [currentTime, setCurrentTime] = useState(0) // tempo atual do vídeo

    // Estados para marcar progresso
    const [savingProgress, setSavingProgress] = useState(false)
    const [dialogTempoCicloOpen, setDialogTempoCicloOpen] = useState(false)
    const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0)

    // Carregar dados do material
    useEffect(() => {
        const loadMaterial = async () => {
            const { id } = await params
            setMaterialId(id)

            // Detectar tempUrl e disciplinaId nos parâmetros de busca
            const urlParams = new URLSearchParams(window.location.search)
            const tempUrl = urlParams.get('tempUrl')
            const disciplinaId = urlParams.get('disciplinaId')

            if (disciplinaId) {
                setDisciplinaIdFromUrl(disciplinaId)
            }

            if (tempUrl) {
                // Se tempUrl estiver presente, usar essa URL para o vídeo
                setMaterial({
                    id: id,
                    nome: "Visualização Temporária",
                    arquivoVideoUrl: tempUrl,
                    tempoAssistido: 0,
                    disciplinas: []
                })
                setVideoBlobUrl(tempUrl)
                setFromCache(false)
            } else {
                // Carregar material do banco de dados
                const materialResponse = await buscarMaterialEstudoPorId(id)

                if (materialResponse.success && materialResponse.data) {
                    setMaterial(materialResponse.data)

                    // Buscar vídeo APENAS do cache IndexedDB
                    console.log('🔍 Buscando vídeo do cache local...')
                    const cachedVideo = await videoCacheService.getVideo(id)

                    if (cachedVideo) {
                        // Vídeo encontrado no cache
                        const blobUrl = URL.createObjectURL(cachedVideo.blob)
                        setVideoBlobUrl(blobUrl)
                        setFromCache(true)
                        console.log('📦 Vídeo carregado do cache local!')
                        toast.success('Vídeo carregado do cache local')
                    } else {
                        // Vídeo não encontrado no cache
                        console.warn('⚠️ Vídeo não encontrado no cache local')
                        toast.error('Vídeo não encontrado no cache. Faça upload novamente do material')
                    }
                }
            }
            setLoading(false)
        }

        loadMaterial()
    }, [params])

    // Iniciar cronômetro automaticamente quando a página carregar
    useEffect(() => {
        if (material && !timerInitialized) {
            console.log('⏱️ Iniciando cronômetro de visualização...')
            setIsTimerRunning(true)
            setElapsedTime(0)
            setTimerInitialized(true)
        }
    }, [material, timerInitialized])

    // Controlar pausa do cronômetro quando aba muda
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isTimerRunning) {
                console.log('⏸️ Aba oculta - pausando cronômetro')
                setIsTimerRunning(false)
            } else if (!document.hidden && timerInitialized && !isTimerRunning) {
                console.log('▶️ Aba visível - retomando cronômetro')
                setIsTimerRunning(true)
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [isTimerRunning, timerInitialized])

    // Atualizar cronômetro a cada segundo
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null

        if (isTimerRunning) {
            interval = setInterval(() => {
                setElapsedTime(prev => prev + 1)
            }, 1000)
        }

        return () => {
            if (interval) {
                clearInterval(interval)
            }
        }
    }, [isTimerRunning])

    // Função para formatar tempo em MM:SS
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60)
        const remainingSeconds = seconds % 60
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    // Função para alternar pausa/play do cronômetro
    const toggleTimer = () => {
        setIsTimerRunning(prev => !prev)
        if (!isTimerRunning) {
            toast.success('Cronômetro retomado')
        } else {
            toast.info('Cronômetro pausado')
        }
    }

    // Callback quando o tempo do vídeo atualiza
    const handleVideoTimeUpdate = (time: number) => {
        setCurrentTime(time)
        console.log(`📹 Tempo do vídeo: ${Math.floor(time)}s`)
    }

    // Função para salvar histórico de visualização
    const saveWatchHistory = async (tempoSegundos: number, tempoVideoAtual: number) => {
        if (!materialId) return

        try {
            const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paginaAtual: Math.floor(tempoVideoAtual), // Usar tempo do vídeo como "página"
                    tempoLeituraSegundos: tempoSegundos,
                    assuntosEstudados: null
                }),
            })

            if (!response.ok) {
                throw new Error('Erro ao salvar histórico de visualização')
            }

            const result = await response.json()
            console.log('✅ Histórico de visualização salvo:', result)
            return result
        } catch (error) {
            console.error('❌ Erro ao salvar histórico de visualização:', error)
            throw error
        }
    }

    // Refs para acesso no cleanup
    const elapsedTimeRef = useRef(elapsedTime)
    const currentTimeRef = useRef(currentTime)
    const materialIdRef = useRef(materialId)
    const lastSavedElapsedSecondsRef = useRef(lastSavedElapsedSeconds)

    useEffect(() => {
        elapsedTimeRef.current = elapsedTime
    }, [elapsedTime])

    useEffect(() => {
        currentTimeRef.current = currentTime
    }, [currentTime])

    useEffect(() => {
        materialIdRef.current = materialId
    }, [materialId])

    useEffect(() => {
        lastSavedElapsedSecondsRef.current = lastSavedElapsedSeconds
    }, [lastSavedElapsedSeconds])

    // Salvar histórico de visualização ao sair da página
    useEffect(() => {
        const handleBeforeUnload = () => {
            const currentElapsed = elapsedTimeRef.current
            const currentMatId = materialIdRef.current
            const videoTime = currentTimeRef.current

            if (currentElapsed > 0 && currentMatId) {
                const data = JSON.stringify({
                    paginaAtual: Math.floor(videoTime),
                    tempoLeituraSegundos: currentElapsed,
                    assuntosEstudados: null
                })

                navigator.sendBeacon(
                    `/api/material/${currentMatId}/historico-leitura`,
                    new Blob([data], { type: 'application/json' })
                )
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)

            // Salvar ao desmontar o componente
            const currentElapsed = elapsedTimeRef.current
            const currentMatId = materialIdRef.current
            const videoTime = currentTimeRef.current

            if (currentElapsed > 0 && currentMatId) {
                fetch(`/api/material/${currentMatId}/historico-leitura`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paginaAtual: Math.floor(videoTime),
                        tempoLeituraSegundos: currentElapsed,
                        assuntosEstudados: null
                    }),
                    keepalive: true
                }).catch(console.error)
            }
        }
    }, [])

    // Função para salvar progresso
    const handleSaveProgress = async () => {
        if (!materialId) return

        // Calcular delta desde o último salvamento usando refs
        const currentElapsed = elapsedTimeRef.current
        const lastSaved = lastSavedElapsedSecondsRef.current
        const deltaMinutos = Math.floor((currentElapsed - lastSaved) / 60)

        console.log('💾 Salvando progresso:', {
            currentElapsed,
            lastSaved,
            deltaSegundos: currentElapsed - lastSaved,
            deltaMinutos,
            vaAbrirModal: deltaMinutos >= 1
        })

        // Se há tempo significativo (>=1 minuto), perguntar sobre adicionar ao ciclo
        if (deltaMinutos >= 1) {
            console.log('📋 Abrindo modal de tempo ao ciclo...')
            setDialogTempoCicloOpen(true)
        } else {
            console.log('⏩ Salvando diretamente sem modal (tempo < 1 minuto)')
            await executarSalvarProgresso()
        }
    }

    const executarSalvarProgresso = async () => {
        if (!materialId) return

        const videoTime = currentTimeRef.current

        setSavingProgress(true)
        try {
            // Atualizar progresso no banco de dados (tempoAssistido)
            await fetch(`/api/material/${materialId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tempoAssistido: Math.floor(videoTime)
                })
            })

            // Salvar histórico de visualização apenas com o delta desde o último salvamento
            const currentElapsed = elapsedTimeRef.current
            const lastSaved = lastSavedElapsedSecondsRef.current
            const deltaSeconds = Math.max(0, currentElapsed - lastSaved)

            if (deltaSeconds > 0) {
                await saveWatchHistory(deltaSeconds, videoTime)
            }

            // Zerar e reiniciar o cronômetro
            console.log('⏱️ Zerando e reiniciando cronômetro após salvar progresso')
            setElapsedTime(0)
            setLastSavedElapsedSeconds(0)

            // Garantir que o timer está rodando
            if (!isTimerRunning) {
                setIsTimerRunning(true)
            }

            // Atualizar material local
            setMaterial((prev: any) => ({
                ...prev,
                tempoAssistido: Math.floor(videoTime)
            }))

            toast.success('Progresso salvo com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar progresso:', error)
            toast.error('Erro ao salvar progresso')
        } finally {
            setSavingProgress(false)
        }
    }

    // Determinar a URL de retorno
    const getBackUrl = () => {
        // 1. Tentar usar disciplinaId da URL
        if (disciplinaIdFromUrl) {
            return `/disciplina/${disciplinaIdFromUrl}/materiais`
        }
        // 2. Tentar usar disciplinaId do material
        if (material) {
            const disciplinaId = material.disciplinas?.[0]?.disciplina?.id || material.disciplinas?.[0]?.disciplinaId
            if (disciplinaId) {
                return `/disciplina/${disciplinaId}/materiais`
            }
        }
        // 3. Fallback: voltar para página anterior
        return null
    }

    const handleBack = () => {
        const backUrl = getBackUrl()
        if (backUrl) {
            router.push(backUrl)
        } else {
            router.back()
        }
    }

    // Verificar se há uma URL temporária nos parâmetros
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const tempUrl = searchParams?.get('tempUrl')

    // Injetar conteúdo customizado no Header
    useEffect(() => {
        if (!material) return

        // Atualizar título do header
        setTitle(material.nome)

        // Ativar modo full-width (sem padding)
        setFullWidth(true)

        // Criar botão de voltar (aparecerá ANTES do título)
        const backBtn = (
            <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0 hover:bg-accent mr-2"
            >
                <ArrowLeft className="h-5 w-5" />
            </Button>
        )
        setBackButton(backBtn)

        // Criar conteúdo customizado para o header
        const headerContent = (
            <>
                {/* Badge de visualização temporária (se aplicável) */}
                {tempUrl && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        Visualização temporária
                    </span>
                )}

                {/* Botão Salvar Progresso - Design Discreto */}
                <Button
                    onClick={handleSaveProgress}
                    disabled={savingProgress}
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 hover:bg-accent disabled:opacity-50"
                >
                    {savingProgress ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            <span className="text-sm">Salvando...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            <span className="text-sm">Salvar</span>
                        </>
                    )}
                </Button>
            </>
        )

        setCustomContent(headerContent)

        // Cleanup: remover conteúdo customizado quando desmontar
        return () => {
            setCustomContent(null)
            setBackButton(null)
            setTitle("Dashboard")
            setFullWidth(false)
        }
    }, [material, fromCache, tempUrl, savingProgress, setCustomContent, setTitle, setBackButton, setFullWidth])

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando material...</p>
                </div>
            </div>
        )
    }

    if (!material) {
        return <div className="h-screen flex items-center justify-center">Material não encontrado</div>
    }

    // Usar a URL do blob (que pode vir do cache ou do servidor)
    const videoUrl = videoBlobUrl || material.arquivoVideoUrl || ''

    return (
        <>
            <div style={{ height: 'calc(100vh - 4rem)', width: '100%' }}>
                {/* Video Player em tela cheia */}
                {videoUrl ? (
                    <VideoPlayer
                        videoUrl={videoUrl}
                        tempoProgressoSegundos={material.tempoAssistido || 0}
                        onTimeUpdate={handleVideoTimeUpdate}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-gray-500">Aguardando URL do vídeo...</p>
                    </div>
                )}
            </div>

            {/* Diálogo para adicionar tempo ao ciclo */}
            {materialId && (
                <AdicionarTempoCicloDialog
                    open={dialogTempoCicloOpen}
                    onOpenChange={setDialogTempoCicloOpen}
                    materialId={materialId}
                    tempoDecorridoMinutos={Math.floor((elapsedTime - lastSavedElapsedSeconds) / 60)}
                    onConfirm={executarSalvarProgresso}
                />
            )}
        </>
    )
}
