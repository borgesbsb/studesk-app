"use client"

import { useEffect, useState, useRef } from "react"
import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { atualizarProgressoMaterial } from "@/interface/actions/material-estudo/update-progress"
import SyncfusionPdfViewer from "@/components/pdf/SyncfusionPdfViewer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Save, Database, WifiOff, CheckCircle2, XCircle, Info, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AdicionarTempoCicloDialog } from "@/components/material-estudo/adicionar-tempo-ciclo-dialog"
import { pdfCacheService } from "@/services/pdf-cache.service"
import { useHeader } from "@/contexts/header-context"

interface PageProps {
    params: Promise<{ id: string }>
}

type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface InlineNotification {
    type: NotificationType
    message: string
    description?: string
}

export default function SyncfusionViewerPage({ params }: PageProps) {
    const router = useRouter()
    const { setCustomContent, setTitle } = useHeader()
    const [materialId, setMaterialId] = useState<string>("")
    const [material, setMaterial] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [disciplinaIdFromUrl, setDisciplinaIdFromUrl] = useState<string>("")
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string>("")
    const [fromCache, setFromCache] = useState<boolean>(false)

    // Estados do cronômetro
    const [elapsedTime, setElapsedTime] = useState(0) // em segundos
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [timerInitialized, setTimerInitialized] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)

    // Estados para marcar progresso
    const [savingProgress, setSavingProgress] = useState(false)
    const [dialogTempoCicloOpen, setDialogTempoCicloOpen] = useState(false)
    const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0)

    // Estado para notificações inline
    const [notification, setNotification] = useState<InlineNotification | null>(null)

    // Função para mostrar notificação inline
    const showNotification = (type: NotificationType, message: string, description?: string) => {
        setNotification({ type, message, description })
        // Auto-dismiss após 4 segundos
        setTimeout(() => {
            setNotification(null)
        }, 4000)
    }

    // Carregar dados do material
    useEffect(() => {
        const loadMaterial = async () => {
            const { id } = await params
            setMaterialId(id)

            // Adicionar lógica para detectar tempUrl e disciplinaId nos parâmetros de busca
            const urlParams = new URLSearchParams(window.location.search)
            const tempUrl = urlParams.get('tempUrl')
            const disciplinaId = urlParams.get('disciplinaId')

            if (disciplinaId) {
                setDisciplinaIdFromUrl(disciplinaId)
            }

            if (tempUrl) {
                // Se tempUrl estiver presente, usar essa URL para o PDF
                setMaterial({
                    id: id,
                    nome: "Visualização Temporária",
                    arquivoPdfUrl: tempUrl,
                    paginasLidas: 0,
                    disciplinas: []
                })
                setPdfBlobUrl(tempUrl)
                setFromCache(false)
            } else {
                // Carregar material do banco de dados
                const materialResponse = await buscarMaterialEstudoPorId(id)

                if (materialResponse.success && materialResponse.data) {
                    setMaterial(materialResponse.data)

                    // Buscar PDF APENAS do cache IndexedDB
                    console.log('🔍 Buscando PDF do cache local...')
                    const cachedPdf = await pdfCacheService.getPdf(id)

                    if (cachedPdf) {
                        // PDF encontrado no cache
                        const blobUrl = URL.createObjectURL(cachedPdf)
                        setPdfBlobUrl(blobUrl)
                        setFromCache(true)
                        console.log('📦 PDF carregado do cache local!')
                        showNotification('success', 'PDF carregado do cache local', 'Armazenado no seu navegador')
                    } else {
                        // PDF não encontrado no cache
                        console.warn('⚠️ PDF não encontrado no cache local')
                        showNotification('error', 'PDF não encontrado no cache', 'Faça upload novamente do material')
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
            console.log('⏱️ Iniciando cronômetro de leitura...')
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
            showNotification('success', 'Cronômetro retomado')
        } else {
            showNotification('info', 'Cronômetro pausado')
        }
    }

    // Função para salvar histórico de leitura
    const saveReadingHistory = async (pagina: number, tempoSegundos: number) => {
        if (!materialId) return

        try {
            const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    paginaAtual: pagina,
                    tempoLeituraSegundos: tempoSegundos,
                    assuntosEstudados: null
                }),
            })

            if (!response.ok) {
                throw new Error('Erro ao salvar histórico de leitura')
            }

            const result = await response.json()
            console.log('✅ Histórico de leitura salvo:', result)
            return result
        } catch (error) {
            console.error('❌ Erro ao salvar histórico de leitura:', error)
            throw error
        }
    }

    // Callback para quando a página mudar
    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        console.log(`📄 Página atual: ${page}`)
    }

    // Refs para acesso no cleanup
    const elapsedTimeRef = useRef(elapsedTime)
    const currentPageRef = useRef(currentPage)
    const materialIdRef = useRef(materialId)
    const lastSavedElapsedSecondsRef = useRef(lastSavedElapsedSeconds)

    useEffect(() => {
        elapsedTimeRef.current = elapsedTime
    }, [elapsedTime])

    useEffect(() => {
        currentPageRef.current = currentPage
    }, [currentPage])

    useEffect(() => {
        materialIdRef.current = materialId
    }, [materialId])

    useEffect(() => {
        lastSavedElapsedSecondsRef.current = lastSavedElapsedSeconds
    }, [lastSavedElapsedSeconds])

    // Salvar histórico de leitura ao sair da página
    useEffect(() => {
        const handleBeforeUnload = () => {
            const currentElapsed = elapsedTimeRef.current
            const currentMatId = materialIdRef.current
            const currentPg = currentPageRef.current

            if (currentElapsed > 0 && currentMatId) {
                const data = JSON.stringify({
                    paginaAtual: currentPg,
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
            const currentPg = currentPageRef.current

            if (currentElapsed > 0 && currentMatId) {
                // Reimplementando a lógica de fetch aqui para garantir acesso aos valores atuais via ref
                fetch(`/api/material/${currentMatId}/historico-leitura`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        paginaAtual: currentPg,
                        tempoLeituraSegundos: currentElapsed,
                        assuntosEstudados: null
                    }),
                    keepalive: true // Importante para requisições durante unload
                }).catch(console.error)
            }
        }
    }, []) // Array de dependências vazio para executar apenas no mount/unmount

    // Função para salvar progresso
    const handleSaveProgress = async () => {
        if (!materialId) return

        // Calcular delta desde o último salvamento usando refs
        const currentElapsed = elapsedTimeRef.current
        const lastSaved = lastSavedElapsedSecondsRef.current
        const deltaMinutos = Math.floor((currentElapsed - lastSaved) / 60)

        // Se há tempo significativo (>=1 minuto), perguntar sobre adicionar ao ciclo
        if (deltaMinutos >= 1) {
            setDialogTempoCicloOpen(true)
        } else {
            // Se não há tempo suficiente, salvar diretamente
            await executarSalvarProgresso()
        }
    }

    const executarSalvarProgresso = async () => {
        if (!materialId) return

        const page = currentPageRef.current

        setSavingProgress(true)
        try {
            // Atualizar progresso no banco de dados
            const paginasLidas = Array.from({ length: page }, (_, i) => i + 1)
            await atualizarProgressoMaterial({
                materialId,
                paginasLidas
            })

            // Salvar histórico de leitura apenas com o delta desde o último salvamento
            const currentElapsed = elapsedTimeRef.current
            const lastSaved = lastSavedElapsedSecondsRef.current
            const deltaSeconds = Math.max(0, currentElapsed - lastSaved)

            if (deltaSeconds > 0) {
                await saveReadingHistory(page, deltaSeconds)
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
                paginasLidas: page
            }))

            showNotification('success', 'Progresso salvo com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar progresso:', error)
            showNotification('error', 'Erro ao salvar progresso')
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

        // Criar conteúdo customizado para o header
        const headerContent = (
            <div className="flex items-center gap-3 w-full">
                {/* Botão Voltar - primeiro elemento */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="shrink-0 hover:bg-accent"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Badges e informações */}
                <div className="flex items-center gap-2">
                    {fromCache && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-md border border-emerald-200">
                            <Database className="h-3 w-3" />
                            Cache Local
                        </span>
                    )}
                    {tempUrl && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                            <AlertCircle className="h-3 w-3" />
                            Visualização temporária
                        </span>
                    )}
                    {fromCache && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded-md border border-gray-200">
                            <WifiOff className="h-3 w-3" />
                            Offline
                        </span>
                    )}
                </div>

                {/* Espaçador flex-1 */}
                <div className="flex-1" />

                {/* Notificação Inline */}
                {notification && (
                    <div
                        className={`flex items-center gap-2.5 px-4 py-2 rounded-lg shadow-lg border-l-4 animate-in slide-in-from-right duration-300 ${
                            notification.type === 'success' ? 'bg-emerald-50 border-emerald-500' :
                            notification.type === 'error' ? 'bg-red-50 border-red-500' :
                            notification.type === 'warning' ? 'bg-amber-50 border-amber-500' :
                            'bg-blue-50 border-blue-500'
                        }`}
                    >
                        {notification.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
                        {notification.type === 'error' && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
                        {notification.type === 'warning' && <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
                        {notification.type === 'info' && <Info className="h-4 w-4 text-blue-600 shrink-0" />}
                        <div className="min-w-0">
                            <p className={`text-sm font-medium ${
                                notification.type === 'success' ? 'text-emerald-900' :
                                notification.type === 'error' ? 'text-red-900' :
                                notification.type === 'warning' ? 'text-amber-900' :
                                'text-blue-900'
                            }`}>
                                {notification.message}
                            </p>
                            {notification.description && (
                                <p className={`text-xs mt-0.5 ${
                                    notification.type === 'success' ? 'text-emerald-700' :
                                    notification.type === 'error' ? 'text-red-700' :
                                    notification.type === 'warning' ? 'text-amber-700' :
                                    'text-blue-700'
                                }`}>
                                    {notification.description}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Cronômetro */}
                <div className="flex items-center gap-2.5 px-4 py-2 bg-background rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                        isTimerRunning
                            ? 'bg-blue-500 shadow-md shadow-blue-200'
                            : 'bg-gray-300'
                    }`}>
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                            Tempo
                        </span>
                        <span className={`text-lg font-mono font-bold leading-none ${
                            isTimerRunning ? 'text-blue-600' : 'text-muted-foreground'
                        } transition-colors`}>
                            {formatTime(elapsedTime)}
                        </span>
                    </div>
                    <button
                        onClick={toggleTimer}
                        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                            isTimerRunning
                                ? 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                        }`}
                        title={isTimerRunning ? 'Pausar cronômetro' : 'Retomar cronômetro'}
                    >
                        {isTimerRunning ? (
                            <Pause className="h-4 w-4" fill="currentColor" />
                        ) : (
                            <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                        )}
                    </button>
                </div>

                {/* Botão Salvar Progresso */}
                <Button
                    onClick={handleSaveProgress}
                    disabled={savingProgress}
                    className="h-10 px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all border-0 disabled:opacity-60"
                >
                    {savingProgress ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            <span>Salvando...</span>
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            <span>Salvar Progresso</span>
                        </>
                    )}
                </Button>
            </div>
        )

        setCustomContent(headerContent)

        // Cleanup: remover conteúdo customizado quando desmontar
        return () => {
            setCustomContent(null)
            setTitle("Dashboard")
        }
    }, [material, fromCache, tempUrl, notification, elapsedTime, isTimerRunning, savingProgress, setCustomContent, setTitle])

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
    const pdfUrl = pdfBlobUrl || material.arquivoPdfUrl || ''

    return (
        <>
            {/* PDF Viewer em tela cheia */}
            <div className="h-[calc(100vh-4rem)]">
                <SyncfusionPdfViewer
                    pdfUrl={pdfUrl}
                    paginaProgresso={material.paginasLidas}
                    onPageChange={handlePageChange}
                />
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
