"use client"

import { useEffect, useState, useRef } from "react"
import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { atualizarProgressoMaterial } from "@/interface/actions/material-estudo/update-progress"
import SyncfusionPdfViewer from "@/components/pdf/SyncfusionPdfViewer"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Play, Pause, Save, Database, Wifi, WifiOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdicionarTempoCicloDialog } from "@/components/material-estudo/adicionar-tempo-ciclo-dialog"
import { pdfCacheService } from "@/services/pdf-cache.service"

interface PageProps {
    params: Promise<{ id: string }>
}

export default function SyncfusionViewerPage({ params }: PageProps) {
    const router = useRouter()
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
                        toast.success('PDF carregado do cache local', {
                            description: 'Armazenado no seu navegador',
                            icon: <Database className="h-4 w-4" />
                        })
                    } else {
                        // PDF não encontrado no cache
                        console.warn('⚠️ PDF não encontrado no cache local')
                        toast.error('PDF não encontrado no cache', {
                            description: 'Faça upload novamente do material'
                        })
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

            toast.success('Progresso salvo com sucesso!')
        } catch (error) {
            console.error('Erro ao salvar progresso:', error)
            toast.error('Erro ao salvar progresso')
        } finally {
            setSavingProgress(false)
        }
    }

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

    // Verificar se há uma URL temporária nos parâmetros
    const searchParams = new URLSearchParams(window.location.search)
    const tempUrl = searchParams.get('tempUrl')

    // Usar a URL do blob (que pode vir do cache ou do servidor)
    const pdfUrl = pdfBlobUrl || material.arquivoPdfUrl || ''

    // Determinar a URL de retorno
    const getBackUrl = () => {
        // 1. Tentar usar disciplinaId da URL
        if (disciplinaIdFromUrl) {
            return `/disciplina/${disciplinaIdFromUrl}/materiais`
        }
        // 2. Tentar usar disciplinaId do material
        const disciplinaId = material.disciplinas?.[0]?.disciplina?.id || material.disciplinas?.[0]?.disciplinaId
        if (disciplinaId) {
            return `/disciplina/${disciplinaId}/materiais`
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

    return (
        <div className="h-screen flex flex-col">
            <div className="bg-white border-b p-4 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="font-semibold text-lg">{material.nome} (Syncfusion POC)</h1>
                        {fromCache && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full border border-green-200">
                                <Database className="h-3 w-3" />
                                Cache Local
                            </span>
                        )}
                    </div>
                    {tempUrl && (
                        <p className="text-xs text-amber-600 mt-0.5">
                            📄 Visualizando arquivo temporário do upload
                        </p>
                    )}
                    {fromCache && (
                        <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                            <WifiOff className="h-3 w-3" />
                            Disponível offline
                        </p>
                    )}
                </div>

                {/* Área de Controles de Estudo */}
                <div className="flex items-center gap-3">
                    {/* Cronômetro */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-full border border-blue-200 shadow-sm">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full ${isTimerRunning ? 'bg-blue-500' : 'bg-gray-400'} transition-colors`}>
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className={`text-base font-mono font-bold min-w-[3.5rem] ${isTimerRunning ? 'text-blue-700' : 'text-gray-600'} transition-colors`}>
                            {formatTime(elapsedTime)}
                        </span>
                        <button
                            onClick={toggleTimer}
                            className={`flex items-center justify-center w-7 h-7 rounded-full transition-all ${
                                isTimerRunning
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-gray-400 hover:bg-gray-500 text-white'
                            }`}
                            title={isTimerRunning ? 'Pausar cronômetro' : 'Retomar cronômetro'}
                        >
                            {isTimerRunning ? (
                                <Pause className="h-3.5 w-3.5" fill="currentColor" />
                            ) : (
                                <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
                            )}
                        </button>
                    </div>

                    {/* Botão Marcar Progresso */}
                    <Button
                        onClick={handleSaveProgress}
                        disabled={savingProgress}
                        className="h-9 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold shadow-md hover:shadow-lg transition-all border-0 rounded-full"
                    >
                        {savingProgress ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                <span className="text-sm">Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                <span className="text-sm">Salvar Progresso</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-white p-4 overflow-hidden">
                <div className="h-full rounded-lg overflow-hidden shadow-sm">
                    <SyncfusionPdfViewer
                        pdfUrl={pdfUrl}
                        paginaProgresso={material.paginasLidas}
                        onPageChange={handlePageChange}
                    />
                </div>
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
        </div>
    )
}
