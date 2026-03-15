"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { buscarMaterialEstudoPorId } from "@/interface/actions/material-estudo/list"
import { Button } from "@/components/ui/button"
import { ArrowLeft, AlertCircle, Download, Wifi } from "lucide-react"
import { useRouter } from "next/navigation"
import { adicionarTempoManual } from "@/interface/actions/dashboard/adicionar-tempo-manual"
import { videoCacheService } from "@/services/video-cache.service"
import { YouTubePlayer } from "@/components/video/YouTubePlayer"
import { useHeader } from "@/contexts/header-context"
import { toast } from "sonner"

function extractYouTubeId(url: string): string | null {
    const patterns = [
        /youtube\.com\/watch\?v=([^&\s]+)/,
        /youtu\.be\/([^?\s]+)/,
        /youtube\.com\/embed\/([^?\s]+)/,
    ]
    for (const rx of patterns) {
        const m = url.match(rx)
        if (m) return m[1]
    }
    return null
}

// Carregar players apenas no cliente
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

/** Detecta a duração real de um vídeo a partir de um Blob */
function getBlobVideoDuration(blob: Blob): Promise<number> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        const blobUrl = URL.createObjectURL(blob)

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(blobUrl)
            resolve(Math.floor(video.duration))
        }

        video.onerror = () => {
            URL.revokeObjectURL(blobUrl)
            reject(new Error('Erro ao detectar duração do vídeo'))
        }

        video.src = blobUrl
    })
}

interface PageProps {
    params: Promise<{ id: string }>
}

export default function VideoViewerPage({ params }: PageProps) {
    const router = useRouter()
    const { setCustomContent, setTitle, setBackButton, setFullWidth } = useHeader()
    // Data selecionada no /hoje passada via ?data=YYYY-MM-DD
    const dataEstudo = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('data') ?? undefined
        : undefined
    const dataEstudoRef = useRef(dataEstudo)
    const [materialId, setMaterialId] = useState<string>("")
    const [material, setMaterial] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [disciplinaIdFromUrl, setDisciplinaIdFromUrl] = useState<string>("")
    const [videoBlobUrl, setVideoBlobUrl] = useState<string>("")
    const [fromCache, setFromCache] = useState<boolean>(false)
    const [isGoogleDriveVideo, setIsGoogleDriveVideo] = useState<boolean>(false)
    const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
    const [youtubeStartTime, setYoutubeStartTime] = useState<number>(0)
    const [showVideoOptions, setShowVideoOptions] = useState<boolean>(false)
    const [loadingVideo, setLoadingVideo] = useState<boolean>(false)
    const [downloadProgress, setDownloadProgress] = useState<number>(0) // 0 a 100
    const [downloadedMB, setDownloadedMB] = useState<number>(0)
    const [totalMB, setTotalMB] = useState<number>(0)

    // Estados do cronômetro
    const [elapsedTime, setElapsedTime] = useState(0) // em segundos
    const [isTimerRunning, setIsTimerRunning] = useState(false)
    const [timerInitialized, setTimerInitialized] = useState(false)
    const [currentTime, setCurrentTime] = useState(0) // tempo atual do vídeo

    // Estados para marcar progresso
    const [savingProgress, setSavingProgress] = useState(false)
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

                    // Verificar se é vídeo do YouTube
                    const ytId = extractYouTubeId(materialResponse.data.arquivoVideoUrl || '')
                    if (ytId) {
                        setYoutubeVideoId(ytId)
                        // Buscar última posição salva no histórico
                        try {
                            const histRes = await fetch(`/api/material/${id}/historico-leitura`)
                            if (histRes.ok) {
                                const histData = await histRes.json()
                                if (histData.success && histData.historico?.length > 0) {
                                    setYoutubeStartTime(histData.historico[0].paginaAtual || 0)
                                }
                            }
                        } catch {}
                        setLoading(false)
                        return
                    }

                    // Verificar se é vídeo do Google Drive
                    const isGDrive = materialResponse.data.arquivoVideoUrl?.startsWith('gdrive://') ||
                                    materialResponse.data.googleDriveFileId !== null

                    // Função para detectar e corrigir duração ao carregar do cache
                    const corrigirDuracaoDoCache = async (blob: Blob, mat: any) => {
                        try {
                            const duracaoReal = await getBlobVideoDuration(blob)
                            const duracaoBanco = mat.duracaoSegundos || 0
                            if (duracaoReal > 0 && Math.abs(duracaoBanco - duracaoReal) > 5) {
                                console.log(`📐 Corrigindo duração: ${duracaoBanco}s → ${duracaoReal}s`)
                                await fetch(`/api/material/${id}/update-duration`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ duracaoSegundos: duracaoReal })
                                })
                                setMaterial((prev: any) => ({ ...prev, duracaoSegundos: duracaoReal }))
                            }
                        } catch (err) {
                            console.warn('Não foi possível detectar duração do cache:', err)
                        }
                    }

                    if (isGDrive) {
                        console.log('☁️ Vídeo do Google Drive detectado')
                        setIsGoogleDriveVideo(true)

                        // Tentar buscar no cache primeiro
                        console.log('🔍 Verificando cache local...')
                        const cachedVideo = await videoCacheService.getVideo(id)

                        if (cachedVideo) {
                            // Vídeo encontrado no cache - reproduzir imediatamente
                            const blobUrl = URL.createObjectURL(cachedVideo.blob)
                            setVideoBlobUrl(blobUrl)
                            setFromCache(true)
                            console.log('📦 Vídeo carregado do cache local!')
                            toast.success('Vídeo carregado do cache local')

                            // Detectar e corrigir duração real
                            corrigirDuracaoDoCache(cachedVideo.blob, materialResponse.data)
                        } else {
                            // Vídeo não está no cache - mostrar opções
                            console.log('⚠️ Vídeo não está no cache - mostrando opções')
                            setShowVideoOptions(true)
                        }
                    } else {
                        // Vídeo tradicional (upload local)
                        console.log('🔍 Buscando vídeo local do cache...')
                        const cachedVideo = await videoCacheService.getVideo(id)

                        if (cachedVideo) {
                            const blobUrl = URL.createObjectURL(cachedVideo.blob)
                            setVideoBlobUrl(blobUrl)
                            setFromCache(true)
                            console.log('📦 Vídeo local carregado do cache!')
                            toast.success('Vídeo carregado do cache local')

                            // Detectar e corrigir duração real
                            corrigirDuracaoDoCache(cachedVideo.blob, materialResponse.data)
                        } else {
                            console.warn('⚠️ Vídeo não encontrado no cache local')
                            toast.error('Vídeo não encontrado no cache. Faça upload novamente do material')
                        }
                    }
                }
            }
            setLoading(false)
        }

        loadMaterial()
    }, [params])

    // Iniciar cronômetro automaticamente quando o material carrega
    useEffect(() => {
        if (material && !timerInitialized) {
            setIsTimerRunning(true)
            setElapsedTime(0)
            setTimerInitialized(true)
        }
    }, [material, timerInitialized])

    // Pausar cronômetro ao trocar de aba, retomar ao voltar
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden && isTimerRunning) {
                setIsTimerRunning(false)
            } else if (!document.hidden && timerInitialized && !isTimerRunning) {
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
    }

    // Callback para YouTube: apenas garante que o timer foi inicializado (play state não controla o cronômetro)
    const handleYouTubePlayState = (_playing: boolean) => {
        if (!timerInitialized) setTimerInitialized(true)
    }

    // Handler para atualizar duração real do vídeo no banco
    const handleVideoDurationLoad = async (duration: number) => {
        if (!materialId || !material) return

        // Verificar se a duração no banco é diferente da real
        const currentDuration = material.duracaoSegundos || 0
        const difference = Math.abs(currentDuration - duration)

        // Se a diferença for maior que 5 segundos, atualizar
        if (difference > 5) {
            console.log(`📐 Duração real detectada: ${duration}s (banco: ${currentDuration}s) - atualizando...`)

            try {
                await fetch(`/api/material/${materialId}/update-duration`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ duracaoSegundos: duration })
                })

                // Atualizar localmente
                setMaterial((prev: any) => ({
                    ...prev,
                    duracaoSegundos: duration
                }))

                console.log('✅ Duração atualizada no banco')
            } catch (error) {
                console.error('❌ Erro ao atualizar duração:', error)
            }
        }
    }


    // Refs para acesso no cleanup e auto-save
    const elapsedTimeRef = useRef(elapsedTime)
    const currentTimeRef = useRef(currentTime)
    const materialIdRef = useRef(materialId)
    const lastSavedElapsedSecondsRef = useRef(lastSavedElapsedSeconds)
    const isTimerRunningRef = useRef(isTimerRunning)
    const disciplinaIdRef = useRef<string>('')

    useEffect(() => { elapsedTimeRef.current = elapsedTime }, [elapsedTime])
    useEffect(() => { currentTimeRef.current = currentTime }, [currentTime])
    useEffect(() => { materialIdRef.current = materialId }, [materialId])
    useEffect(() => { lastSavedElapsedSecondsRef.current = lastSavedElapsedSeconds }, [lastSavedElapsedSeconds])
    useEffect(() => { isTimerRunningRef.current = isTimerRunning }, [isTimerRunning])
    useEffect(() => {
        if (disciplinaIdFromUrl) {
            disciplinaIdRef.current = disciplinaIdFromUrl
        } else if (material?.disciplinas?.[0]) {
            const id = material.disciplinas[0].disciplina?.id || material.disciplinas[0].disciplinaId
            if (id) disciplinaIdRef.current = id
        }
    }, [disciplinaIdFromUrl, material])

    // Auto-save a cada 2 minutos enquanto o vídeo está tocando
    useEffect(() => {
        const interval = setInterval(async () => {
            const elapsed = elapsedTimeRef.current
            const lastSaved = lastSavedElapsedSecondsRef.current
            const matId = materialIdRef.current
            const videoTime = currentTimeRef.current
            const disciplinaId = disciplinaIdRef.current

            if (!isTimerRunningRef.current || !matId) return
            const delta = elapsed - lastSaved
            if (delta < 120) return // menos de 2 min desde último save

            try {
                await fetch(`/api/material/${matId}/historico-leitura`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        paginaAtual: Math.floor(videoTime),
                        tempoLeituraSegundos: delta,
                        assuntosEstudados: null,
                        ...(dataEstudoRef.current ? { dataEstudo: dataEstudoRef.current } : {})
                    })
                })

                // Adicionar tempo ao ciclo de estudos automaticamente
                if (disciplinaId) {
                    const deltaMinutos = Math.floor(delta / 60)
                    if (deltaMinutos >= 1) {
                        await adicionarTempoManual({
                            disciplinaId,
                            horas: 0,
                            minutos: deltaMinutos,
                            data: dataEstudoRef.current ? new Date(`${dataEstudoRef.current}T12:00:00Z`) : undefined,
                        })
                    }
                }

                lastSavedElapsedSecondsRef.current = elapsed
                setLastSavedElapsedSeconds(elapsed)
                toast.success('Progresso salvo automaticamente')
            } catch {}
        }, 30000) // verifica a cada 30s

        return () => clearInterval(interval)
    }, [])

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
                    assuntosEstudados: null,
                    ...(dataEstudoRef.current ? { dataEstudo: dataEstudoRef.current } : {})
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
                        assuntosEstudados: null,
                        ...(dataEstudoRef.current ? { dataEstudo: dataEstudoRef.current } : {})
                    }),
                    keepalive: true
                }).catch(console.error)
            }
        }
    }, [])

    // Salvar sessão: adiciona o tempo ao ciclo de estudos e reinicia o cronômetro
    const handleSalvarSessao = async () => {
        if (!materialId) return

        const currentElapsed = elapsedTimeRef.current
        const lastSaved = lastSavedElapsedSecondsRef.current
        const delta = Math.max(0, currentElapsed - lastSaved)
        const disciplinaId = disciplinaIdRef.current
        const deltaMinutos = Math.floor(delta / 60)

        if (deltaMinutos < 1) {
            toast.info('Sessão menor que 1 minuto — continue estudando!')
            return
        }

        setSavingProgress(true)
        try {
            if (disciplinaId) {
                await adicionarTempoManual({
                    disciplinaId,
                    horas: 0,
                    minutos: deltaMinutos,
                })
            }

            // Reiniciar cronômetro para a próxima sessão
            lastSavedElapsedSecondsRef.current = 0
            setLastSavedElapsedSeconds(0)
            setElapsedTime(0)
            if (!isTimerRunning) setIsTimerRunning(true)

            toast.success('Sessão salva!')
        } catch (error) {
            console.error('Erro ao salvar sessão:', error)
            toast.error('Erro ao salvar sessão')
        } finally {
            setSavingProgress(false)
        }
    }

    // Função para reconectar Google Drive via popup (sem sair da página)
    const reconnectGoogleDrive = (): Promise<boolean> => {
        return new Promise(async (resolve) => {
            try {
                toast.info('Token expirado. Abrindo janela para reconectar ao Google Drive...')

                // Buscar URL de autenticação
                const authResponse = await fetch('/api/google-drive/auth')
                const authData = await authResponse.json()

                if (!authData.authUrl) {
                    toast.error('Erro ao obter URL de autenticação')
                    resolve(false)
                    return
                }

                // Abrir popup de autenticação
                const width = 600
                const height = 700
                const left = window.screenX + (window.outerWidth - width) / 2
                const top = window.screenY + (window.outerHeight - height) / 2
                const popup = window.open(
                    authData.authUrl,
                    'google-drive-auth',
                    `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
                )

                // Escutar mensagem de sucesso/erro do popup
                const handleMessage = (event: MessageEvent) => {
                    if (event.data?.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
                        window.removeEventListener('message', handleMessage)
                        toast.success('Google Drive reconectado! Retomando...')
                        resolve(true)
                    } else if (event.data?.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
                        window.removeEventListener('message', handleMessage)
                        toast.error('Falha ao reconectar Google Drive')
                        resolve(false)
                    }
                }

                window.addEventListener('message', handleMessage)

                // Verificar se popup foi fechado sem autenticar
                const checkClosed = setInterval(() => {
                    if (popup && popup.closed) {
                        clearInterval(checkClosed)
                        window.removeEventListener('message', handleMessage)
                        // Dar tempo para a mensagem chegar antes de resolver como falso
                        setTimeout(() => resolve(false), 500)
                    }
                }, 500)
            } catch (error) {
                console.error('Erro ao reconectar Google Drive:', error)
                toast.error('Erro ao iniciar reconexão')
                resolve(false)
            }
        })
    }

    // Função para fazer streaming direto do Google Drive
    const handleStreamOnline = async () => {
        if (!materialId) return

        setLoadingVideo(true)
        setShowVideoOptions(false)

        try {
            console.log('📡 Fazendo streaming do Google Drive...')

            // Verificar se o token é válido antes de iniciar streaming
            const checkResponse = await fetch(`/api/video/google-drive-stream/${materialId}`, { method: 'HEAD' })

            if (!checkResponse.ok) {
                const errorData = await checkResponse.json().catch(() => null)
                if (errorData?.code === 'GOOGLE_DRIVE_RECONNECT' || checkResponse.status === 401) {
                    const reconnected = await reconnectGoogleDrive()
                    if (reconnected) {
                        setLoadingVideo(false)
                        handleStreamOnline()
                        return
                    }
                    toast.error('Não foi possível reconectar ao Google Drive.')
                    setShowVideoOptions(true)
                    setLoadingVideo(false)
                    return
                }
            }

            // Usar endpoint de streaming (com suporte a range requests)
            const streamUrl = `/api/video/google-drive-stream/${materialId}`
            setVideoBlobUrl(streamUrl)
            setFromCache(false)

            toast.success('Streaming iniciado do Google Drive')
        } catch (error) {
            console.error('Erro ao fazer streaming:', error)
            toast.error('Erro ao fazer streaming do vídeo')
            setShowVideoOptions(true)
        } finally {
            setLoadingVideo(false)
        }
    }

    // Função para baixar e cachear vídeo do Google Drive
    const handleDownloadAndCache = async () => {
        if (!materialId || !material) return

        setLoadingVideo(true)
        setShowVideoOptions(false)
        setDownloadProgress(0)
        setDownloadedMB(0)
        setTotalMB(0)

        try {
            console.log('⬇️ Baixando vídeo do Google Drive...')

            const response = await fetch(`/api/video/google-drive-download/${materialId}`)

            if (!response.ok) {
                const errorData = await response.json().catch(() => null)
                console.error('Detalhes do erro da API:', errorData)

                if (errorData?.code === 'GOOGLE_DRIVE_RECONNECT') {
                    // Abrir popup de reconexão automática
                    const reconnected = await reconnectGoogleDrive()
                    if (reconnected) {
                        // Tentar baixar novamente após reconexão
                        setLoadingVideo(false)
                        handleDownloadAndCache()
                        return
                    }
                    toast.error('Não foi possível reconectar ao Google Drive.')
                    setShowVideoOptions(true)
                    setLoadingVideo(false)
                    return
                }

                const errorMsg = errorData?.googleError || errorData?.details || response.statusText
                throw new Error(`Erro ao baixar: ${errorMsg}`)
            }

            // Ler o stream com progresso
            const contentLength = parseInt(response.headers.get('Content-Length') || '0')
            const totalSizeMB = contentLength / (1024 * 1024)
            setTotalMB(totalSizeMB)

            const reader = response.body?.getReader()
            if (!reader) throw new Error('Stream não disponível')

            const chunks: Uint8Array[] = []
            let receivedLength = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                chunks.push(value)
                receivedLength += value.length

                const currentMB = receivedLength / (1024 * 1024)
                setDownloadedMB(currentMB)

                if (contentLength > 0) {
                    setDownloadProgress(Math.round((receivedLength / contentLength) * 100))
                }
            }

            // Montar blob a partir dos chunks
            const blob = new Blob(chunks, { type: response.headers.get('Content-Type') || 'video/mp4' })
            console.log('✅ Vídeo baixado, detectando duração real...')

            // Detectar duração real do vídeo a partir do blob
            const duracaoReal = await getBlobVideoDuration(blob)
            console.log(`📐 Duração real detectada do blob: ${duracaoReal}s (${Math.floor(duracaoReal / 60)}m ${duracaoReal % 60}s)`)

            // Salvar no cache IndexedDB com duração real
            await videoCacheService.saveVideoFromBlob(
                materialId,
                blob,
                material.googleDriveFileName || `${material.nome}.mp4`,
                blob.type || 'video/mp4',
                duracaoReal
            )

            console.log('✅ Vídeo salvo no cache!')

            // Atualizar duração no banco se diferente
            const currentDuration = material.duracaoSegundos || 0
            if (Math.abs(currentDuration - duracaoReal) > 5) {
                try {
                    await fetch(`/api/material/${materialId}/update-duration`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ duracaoSegundos: duracaoReal })
                    })
                    setMaterial((prev: any) => ({ ...prev, duracaoSegundos: duracaoReal }))
                    console.log('✅ Duração atualizada no banco')
                } catch (err) {
                    console.error('❌ Erro ao atualizar duração no banco:', err)
                }
            }

            // Criar Blob URL para reprodução
            const blobUrl = URL.createObjectURL(blob)
            setVideoBlobUrl(blobUrl)
            setFromCache(true)

            toast.success('Vídeo baixado e salvo no cache!')
        } catch (error) {
            console.error('Erro ao baixar e cachear vídeo:', error)
            toast.error('Erro ao baixar vídeo. Tente fazer streaming online.')
            setShowVideoOptions(true)
        } finally {
            setLoadingVideo(false)
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
        router.back()
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

        // Criar conteúdo customizado para o header (apenas badge temporário se aplicável)
        if (tempUrl) {
            const headerContent = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-md border border-amber-200">
                    <AlertCircle className="h-3 w-3" />
                    Visualização temporária
                </span>
            )
            setCustomContent(headerContent)
        } else {
            setCustomContent(null)
        }

        // Cleanup: remover conteúdo customizado quando desmontar
        return () => {
            setCustomContent(null)
            setBackButton(null)
            setTitle("Dashboard")
            setFullWidth(false)
        }
    }, [material, fromCache, tempUrl, setCustomContent, setTitle, setBackButton, setFullWidth])

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
    // Filtrar URLs gdrive:// que o browser não suporta diretamente
    const rawUrl = material.arquivoVideoUrl || ''
    const videoUrl = videoBlobUrl || (rawUrl.startsWith('gdrive://') ? '' : rawUrl)

    return (
        <>
            <div style={{ height: 'calc(100vh - 4rem)', width: '100%' }}>
                {/* Opções de vídeo do Google Drive */}
                {loadingVideo && isGoogleDriveVideo ? (
                    <div className="h-full w-full flex items-center justify-center bg-gray-50">
                        <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <Download className="h-6 w-6 text-blue-600 animate-bounce" />
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Baixando vídeo...
                                </h2>
                            </div>

                            {/* Barra de progresso */}
                            <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>

                            <div className="flex justify-between text-sm text-gray-600">
                                <span>
                                    {totalMB > 0
                                        ? `${downloadedMB.toFixed(1)} MB / ${totalMB.toFixed(1)} MB`
                                        : `${downloadedMB.toFixed(1)} MB baixados`
                                    }
                                </span>
                                <span className="font-medium">{downloadProgress}%</span>
                            </div>

                            <p className="text-xs text-gray-400 mt-3 text-center">
                                Não feche esta página durante o download
                            </p>
                        </div>
                    </div>
                ) : showVideoOptions && isGoogleDriveVideo ? (
                    <div className="h-full w-full flex items-center justify-center bg-gray-50">
                        <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-2 text-gray-900">
                                Como deseja assistir?
                            </h2>
                            <p className="text-gray-600 text-sm mb-6">
                                Este vídeo está armazenado no Google Drive. Escolha uma opção:
                            </p>

                            <div className="space-y-3">
                                {/* Opção: Streaming Online */}
                                <button
                                    onClick={handleStreamOnline}
                                    disabled={loadingVideo}
                                    className="w-full flex items-start gap-3 p-4 border-2 border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Wifi className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-left flex-1">
                                        <div className="font-medium text-gray-900 mb-1">
                                            Fazer Streaming Online
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Assista diretamente do Google Drive sem ocupar espaço no dispositivo.
                                            Requer conexão com internet.
                                        </div>
                                    </div>
                                </button>

                                {/* Opção: Baixar e Cachear */}
                                <button
                                    onClick={handleDownloadAndCache}
                                    disabled={loadingVideo}
                                    className="w-full flex items-start gap-3 p-4 border-2 border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="h-6 w-6 text-green-600 shrink-0 mt-0.5" />
                                    <div className="text-left flex-1">
                                        <div className="font-medium text-gray-900 mb-1">
                                            Baixar e Salvar no Cache
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Baixe o vídeo para assistir offline. O vídeo ficará salvo no cache
                                            do navegador (até 2GB).
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : youtubeVideoId ? (
                    /* YouTube Player */
                    <div className="flex flex-col h-full">
                        <div className="flex-1">
                            <YouTubePlayer
                                videoId={youtubeVideoId}
                                materialId={materialId}
                                startTimeSeconds={youtubeStartTime}
                                onPlayStateChange={handleYouTubePlayState}
                                onTimeUpdate={handleVideoTimeUpdate}
                                onDurationLoad={handleVideoDurationLoad}
                            />
                        </div>
                        {/* Barra de controles inferior */}
                        <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shrink-0">
                            {/* Indicador de estado */}
                            <div className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${isTimerRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                                <span className="text-xs text-gray-400">{isTimerRunning ? 'Gravando' : 'Pausado'}</span>
                            </div>

                            <div className="w-px h-4 bg-gray-600" />

                            {/* Cronômetro da sessão */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-400">Sessão</span>
                                <span className="font-mono text-sm font-semibold text-white tabular-nums">
                                    {String(Math.floor(elapsedTime / 3600)).padStart(2, '0')}:{String(Math.floor((elapsedTime % 3600) / 60)).padStart(2, '0')}:{String(elapsedTime % 60).padStart(2, '0')}
                                </span>
                            </div>

                            <div className="flex-1" />

                            <button
                                onClick={handleSalvarSessao}
                                disabled={savingProgress || elapsedTime === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {savingProgress ? 'Salvando...' : 'Salvar Sessão'}
                            </button>
                        </div>
                    </div>
                ) : videoUrl ? (
                    /* Video Player em tela cheia */
                    <VideoPlayer
                        videoUrl={videoUrl}
                        tempoProgressoSegundos={material.tempoAssistido || 0}
                        onTimeUpdate={handleVideoTimeUpdate}
                        onDurationLoad={handleVideoDurationLoad}
                        onSave={handleSalvarSessao}
                        savingProgress={savingProgress}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <p className="text-gray-500">Aguardando URL do vídeo...</p>
                    </div>
                )}
            </div>
        </>
    )
}
