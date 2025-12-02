"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { atualizarProgressoMaterial } from "@/interface/actions/material-estudo/update-progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Save, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { AdicionarTempoCicloDialog } from "@/components/material-estudo/adicionar-tempo-ciclo-dialog"
import { pdfCacheService } from "@/services/pdf-cache.service"
import { useHeader } from "@/contexts/header-context"
import { toast } from "sonner"

// Carregar Syncfusion apenas no cliente para evitar problemas de SSR
const SyncfusionPdfViewer = dynamic(
    () => import("@/components/pdf/SyncfusionPdfViewer"),
    {
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Carregando visualizador...</p>
                </div>
            </div>
        )
    }
)

interface PageProps {
    params: Promise<{ id: string }>
}

export default function SyncfusionViewerPage({ params }: PageProps) {
    const router = useRouter()
    const { setCustomContent, setTitle, setBackButton, setFullWidth } = useHeader()
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

    // Log para debug do progresso
    useEffect(() => {
        if (material) {
            console.log('📊 Material carregado com progresso:', {
                id: material.id,
                nome: material.nome,
                paginasLidas: material.paginasLidas,
                totalPaginas: material.totalPaginas
            });
        }
    }, [material]);

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
                        toast.success('PDF carregado do cache local')
                    } else {
                        // PDF não encontrado no cache
                        console.warn('⚠️ PDF não encontrado no cache local')
                        toast.error('PDF não encontrado no cache. Faça upload novamente do material')
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
            toast.success('Cronômetro retomado')
        } else {
            toast.info('Cronômetro pausado')
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

                {/* Cronômetro - Design Discreto */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-accent/50 transition-colors">
                    <button
                        onClick={toggleTimer}
                        className="flex items-center gap-2 group"
                        title={isTimerRunning ? 'Pausar cronômetro' : 'Retomar cronômetro'}
                    >
                        {isTimerRunning ? (
                            <Pause className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        ) : (
                            <Play className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                        <span className={`text-sm font-mono tabular-nums ${
                            isTimerRunning ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                            {formatTime(elapsedTime)}
                        </span>
                    </button>
                </div>

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
    }, [material, fromCache, tempUrl, elapsedTime, isTimerRunning, savingProgress, setCustomContent, setTitle, setBackButton, setFullWidth])

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
            <div style={{ height: 'calc(100vh - 4rem)', width: '100%' }}>
                {/* PDF Viewer em tela cheia */}
                {pdfUrl ? (
                    <SyncfusionPdfViewer
                        pdfUrl={pdfUrl}
                        paginaProgresso={material?.paginasLidas || 1}
                        onPageChange={handlePageChange}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-gray-500">Aguardando URL do PDF...</p>
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
