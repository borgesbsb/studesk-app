'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { ArrowLeft, Settings, Type, Minus, Plus, Clock, Bookmark, ChevronLeft, ChevronRight, Search, Volume2, VolumeX, Play, Pause, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MobileTextReaderProps {
  materialId: string
  initialPage?: number
}

interface PageData {
  pageNum: number
  content: string
  startOffset: number
  endOffset: number
}

export function MobileTextReader({ materialId, initialPage }: MobileTextReaderProps) {
  const router = useRouter()
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Configurações de leitura
  const [fontSize, setFontSize] = useState(16)
  const [lineHeight, setLineHeight] = useState(1.6)
  const [theme, setTheme] = useState<'light' | 'sepia' | 'dark'>('light')

  // Text-to-Speech
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speechRate, setSpeechRate] = useState(1.0)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('')
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Cronômetro de leitura
  const [timeSpent, setTimeSpent] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Navegação de páginas
  const [showGoToPage, setShowGoToPage] = useState(false)
  const [goToPageInput, setGoToPageInput] = useState('')

  // Lazy loading de páginas
  const [renderedPages, setRenderedPages] = useState(3) // Inicialmente renderizar apenas 3 páginas
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  // Refs para rastreamento de páginas
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchText()
  }, [materialId])

  // Carregar vozes disponíveis
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      // Filtrar vozes em português
      const ptVoices = voices.filter(voice =>
        voice.lang.startsWith('pt-') || voice.lang.startsWith('pt_')
      )
      setAvailableVoices(ptVoices.length > 0 ? ptVoices : voices)

      // Selecionar primeira voz PT-BR se disponível
      const defaultVoice = ptVoices.find(v => v.lang === 'pt-BR') || ptVoices[0] || voices[0]
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.name)
      }
    }

    loadVoices()

    // Algumas browsers carregam vozes assincronamente
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      // Limpar ao desmontar
      window.speechSynthesis.cancel()
    }
  }, [])

  // Processar texto para extrair páginas baseado nos marcadores [PAGE_X]
  const pages = useMemo(() => {
    if (!text) return []

    const pageRegex = /\[PAGE_(\d+)\]/g
    const pagesData: PageData[] = []
    let match
    let lastIndex = 0
    const hasPageMarkers = pageRegex.test(text)

    // Reset regex após test()
    pageRegex.lastIndex = 0

    if (hasPageMarkers) {
      // Se tem marcadores PAGE, usar os números reais do PDF
      let previousPageNum = 0

      while ((match = pageRegex.exec(text)) !== null) {
        const markerIndex = match.index
        const extractedPageNum = parseInt(match[1])

        if (lastIndex > 0 && previousPageNum > 0) {
          // Conteúdo da página anterior (usa o número real do PDF)
          const content = text.substring(lastIndex, markerIndex).trim()
          if (content) {
            pagesData.push({
              pageNum: previousPageNum,
              content,
              startOffset: lastIndex,
              endOffset: markerIndex,
            })
          }
        }

        previousPageNum = extractedPageNum
        lastIndex = markerIndex + match[0].length
      }

      // Adicionar última página (usa o último número extraído)
      if (lastIndex < text.length && previousPageNum > 0) {
        const content = text.substring(lastIndex).trim()
        if (content) {
          pagesData.push({
            pageNum: previousPageNum,
            content,
            startOffset: lastIndex,
            endOffset: text.length,
          })
        }
      }
    } else {
      // Se NÃO tem marcadores, tratar todo o texto como página 1
      pagesData.push({
        pageNum: 1,
        content: text,
        startOffset: 0,
        endOffset: text.length,
      })
    }

    // Definir totalPages como o número da última página
    if (pagesData.length > 0) {
      const lastPage = pagesData[pagesData.length - 1]
      setTotalPages(lastPage.pageNum)
      console.log('📄 Páginas extraídas:', pagesData.map(p => p.pageNum).join(', '))
      console.log('📄 Total de páginas:', lastPage.pageNum)
    } else {
      setTotalPages(1)
    }

    return pagesData
  }, [text])

  // Inicializar currentPage com o número da primeira página real
  useEffect(() => {
    if (pages.length > 0 && currentPage === 1) {
      const firstPage = pages[0]
      if (firstPage.pageNum !== 1) {
        setCurrentPage(firstPage.pageNum)
      }
    }
  }, [pages, currentPage])

  // Cronômetro de tempo de leitura
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Lazy loading - renderizar mais páginas quando o usuário scrola
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current
    if (!trigger || pages.length <= renderedPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedPages < pages.length) {
          console.log(`📄 Carregando mais páginas... (${renderedPages}/${pages.length})`)
          setRenderedPages((prev) => Math.min(prev + 2, pages.length)) // Carregar 2 páginas por vez
        }
      },
      { rootMargin: '300px' } // Carregar quando estiver a 300px do trigger
    )

    observer.observe(trigger)

    return () => {
      observer.disconnect()
    }
  }, [pages.length, renderedPages])

  // Detectar página atual baseado no scroll
  useEffect(() => {
    const handleScroll = () => {
      if (pages.length === 0) return

      const scrollPosition = window.scrollY + window.innerHeight / 2

      for (const page of pages) {
        const pageElement = pageRefs.current.get(page.pageNum)
        if (pageElement) {
          const rect = pageElement.getBoundingClientRect()
          const elementTop = rect.top + window.scrollY
          const elementBottom = elementTop + rect.height

          if (scrollPosition >= elementTop && scrollPosition <= elementBottom) {
            setCurrentPage(page.pageNum)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Calcular página inicial

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pages])

  // Navegar para página inicial quando fornecida
  useEffect(() => {
    if (initialPage && pages.length > 0 && !loading) {
      // Aguardar um momento para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        console.log(`📖 Navegando para página inicial: ${initialPage}`)
        goToPage(initialPage)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [initialPage, pages.length, loading])

  const fetchText = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/pdf/${materialId}/mobile-text`,
        {
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao buscar texto')
      }

      const data = await response.json()

      if (data.success && data.data?.formattedText) {
        setText(data.data.formattedText)
      } else {
        throw new Error('Texto não disponível')
      }
    } catch (err) {
      console.error('Erro ao buscar texto:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const themes = {
    light: {
      bg: 'bg-white',
      text: 'text-gray-900',
      toolbar: 'bg-white border-gray-200'
    },
    sepia: {
      bg: 'bg-[#f4ecd8]',
      text: 'text-gray-900',
      toolbar: 'bg-[#f4ecd8] border-[#d4c4a8]'
    },
    dark: {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
      toolbar: 'bg-gray-800 border-gray-700'
    }
  }

  const currentTheme = themes[theme]

  // Navegar para uma página específica
  const goToPage = (pageNum: number) => {
    // Encontrar índice da página
    const pageIndex = pages.findIndex(p => p.pageNum === pageNum)
    if (pageIndex === -1) {
      console.warn(`Página ${pageNum} não existe`)
      return
    }

    // Garantir que a página está renderizada
    if (pageIndex >= renderedPages) {
      console.log(`📄 Renderizando páginas até ${pageIndex + 1}...`)
      setRenderedPages(pageIndex + 1)

      // Aguardar renderização e então fazer scroll
      setTimeout(() => {
        const pageElement = pageRefs.current.get(pageNum)
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setCurrentPage(pageNum)
        }
      }, 100)
    } else {
      const pageElement = pageRefs.current.get(pageNum)
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setCurrentPage(pageNum)
      } else {
        console.warn(`Página ${pageNum} não encontrada no DOM`)
      }
    }
  }

  // Página anterior
  const goToPreviousPage = () => {
    const currentIndex = pages.findIndex(p => p.pageNum === currentPage)
    if (currentIndex > 0) {
      const prevPage = pages[currentIndex - 1]
      goToPage(prevPage.pageNum)
    }
  }

  // Próxima página
  const goToNextPage = () => {
    const currentIndex = pages.findIndex(p => p.pageNum === currentPage)
    if (currentIndex < pages.length - 1) {
      const nextPage = pages[currentIndex + 1]
      goToPage(nextPage.pageNum)
    }
  }

  // Ir para página digitada
  const handleGoToPageSubmit = () => {
    const pageNum = parseInt(goToPageInput)
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      goToPage(pageNum)
      setGoToPageInput('')
      setShowGoToPage(false)
    } else {
      alert(`Por favor, digite um número entre 1 e ${totalPages}`)
    }
  }

  // Salvar progresso de leitura
  const handleSaveProgress = async () => {
    if (savingProgress) return

    setSavingProgress(true)
    try {
      // Salvar progresso de leitura
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/material/${materialId}/progress`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            paginasLidas: currentPage,
          }),
        }
      )

      if (response.ok) {
        console.log('Progresso salvo com sucesso')
      }

      // Salvar histórico de leitura
      const historicoResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/material/${materialId}/historico-leitura`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            paginaAtual: currentPage,
            tempoLeituraSegundos: timeSpent,
            assuntosEstudados: null,
          }),
        }
      )

      if (historicoResponse.ok) {
        console.log('Histórico de leitura salvo com sucesso')
        alert(`Progresso salvo - Página ${currentPage} - Tempo: ${Math.floor(timeSpent / 60)}:${(timeSpent % 60).toString().padStart(2, '0')}`)
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
      alert('Erro ao salvar progresso')
    } finally {
      setSavingProgress(false)
    }
  }

  // Text-to-Speech Functions
  const getCurrentPageText = () => {
    const currentPageData = pages.find(p => p.pageNum === currentPage)
    if (!currentPageData) return ''

    // Remover markdown e limpar o texto
    return currentPageData.content
      .replace(/#{1,6}\s/g, '') // Remove markdown headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, mantém texto
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
      .trim()
  }

  const handlePlayPause = () => {
    if (!window.speechSynthesis) {
      alert('Seu navegador não suporta leitura em voz alta')
      return
    }

    if (isSpeaking && !isPaused) {
      // Pausar
      window.speechSynthesis.pause()
      setIsPaused(true)
    } else if (isPaused) {
      // Continuar
      window.speechSynthesis.resume()
      setIsPaused(false)
    } else {
      // Iniciar nova leitura
      const textToSpeak = getCurrentPageText()

      if (!textToSpeak) {
        alert('Nenhum texto para ler na página atual')
        return
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak)

      // Configurar voz
      const voice = availableVoices.find(v => v.name === selectedVoice)
      if (voice) {
        utterance.voice = voice
      }

      utterance.lang = 'pt-BR'
      utterance.rate = speechRate
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Event listeners
      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
        console.log('🔊 Iniciou leitura em voz alta')
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        console.log('🔇 Finalizou leitura em voz alta')
      }

      utterance.onerror = (event) => {
        console.error('Erro no TTS:', event)
        setIsSpeaking(false)
        setIsPaused(false)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando texto...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${currentTheme.bg} ${currentTheme.text}`}>
      {/* Toolbar fixa */}
      <div className={`sticky top-0 z-10 ${currentTheme.toolbar} border-b px-4 py-3`}>
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {/* Botão Voltar */}
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Cronômetro e Botões */}
          <div className="flex items-center gap-2">
            {/* Página Atual */}
            <div className="text-xs font-medium">
              Pág. {currentPage}/{totalPages}
            </div>

            {/* Cronômetro */}
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="w-4 h-4" />
              <span>
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Botão TTS Play/Pause */}
            <button
              onClick={handlePlayPause}
              className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                isSpeaking ? 'bg-blue-100 dark:bg-blue-900' : ''
              }`}
              title={isPaused ? 'Continuar' : isSpeaking ? 'Pausar' : 'Ouvir'}
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-blue-600" />
              ) : isSpeaking ? (
                <Pause className="w-5 h-5 text-blue-600" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            {/* Botão Stop (apenas quando está tocando) */}
            {isSpeaking && (
              <button
                onClick={handleStop}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Parar"
              >
                <Square className="w-5 h-5 text-red-600" />
              </button>
            )}

            {/* Botão Marcar Progresso */}
            <button
              onClick={handleSaveProgress}
              disabled={savingProgress}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
              title="Marcar Progresso"
            >
              <Bookmark className="w-5 h-5" />
            </button>

            {/* Botão Configurações */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Painel de Configurações - Modal Flutuante */}
      {showSettings && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowSettings(false)}
        >
          <div
            className={`${currentTheme.bg} ${currentTheme.text} rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-xl animate-slide-up`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="flex justify-center mb-4 sm:hidden">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Configurações de Leitura</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Tamanho da fonte */}
              <div>
                <label className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  Tamanho da fonte
                </label>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setFontSize(Math.max(12, fontSize - 2))}
                    className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-2xl font-bold min-w-[4ch] text-center">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                    className="p-3 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Espaçamento de linha */}
              <div>
                <label className="text-sm font-medium mb-3 block">
                  Espaçamento entre linhas
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1.4, 1.6, 1.8, 2.0].map((lh) => (
                    <button
                      key={lh}
                      onClick={() => setLineHeight(lh)}
                      className={`px-3 py-3 rounded-lg text-sm font-bold transition-colors ${
                        lineHeight === lh
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {lh}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tema */}
              <div>
                <label className="text-sm font-medium mb-3 block">Tema</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }`}
                  >
                    Claro
                  </button>
                  <button
                    onClick={() => setTheme('sepia')}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'sepia'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#f4ecd8] text-gray-900 hover:bg-[#e4dcb8]'
                    }`}
                  >
                    Sépia
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                    }`}
                  >
                    Escuro
                  </button>
                </div>
              </div>

              {/* Divisor */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Configurações de Áudio */}
              <div>
                <label className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Leitura em Voz Alta
                </label>

                {/* Voz */}
                <div className="mb-4">
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                    Voz
                  </label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm"
                  >
                    {availableVoices.length === 0 ? (
                      <option>Carregando vozes...</option>
                    ) : (
                      availableVoices.map((voice) => (
                        <option key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Velocidade */}
                <div>
                  <label className="text-xs text-gray-600 dark:text-gray-400 mb-2 block">
                    Velocidade: {speechRate.toFixed(1)}x
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSpeechRate(Math.max(0.5, speechRate - 0.1))}
                      className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      disabled={speechRate <= 0.5}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={speechRate}
                      onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      onClick={() => setSpeechRate(Math.min(2.0, speechRate + 0.1))}
                      className="p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      disabled={speechRate >= 2.0}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5x</span>
                    <span>1.0x</span>
                    <span>2.0x</span>
                  </div>
                </div>

                {/* Status */}
                {isSpeaking && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium flex items-center gap-2">
                      <Volume2 className="w-4 h-4 animate-pulse" />
                      {isPaused ? 'Pausado' : 'Reproduzindo...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx>{`
            @keyframes slide-up {
              from {
                transform: translateY(100%);
              }
              to {
                transform: translateY(0);
              }
            }
            .animate-slide-up {
              animation: slide-up 0.3s ease-out;
            }
          `}</style>
        </div>
      )}

      {/* Navegador de Páginas Flutuante */}
      {totalPages > 1 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <div className={`flex items-center gap-2 ${currentTheme.toolbar} border rounded-full px-4 py-2 shadow-lg`}>
            {/* Botão Anterior */}
            <button
              onClick={goToPreviousPage}
              disabled={pages.findIndex(p => p.pageNum === currentPage) === 0}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Página Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Indicador de Página Clicável */}
            <button
              onClick={() => setShowGoToPage(!showGoToPage)}
              className="px-3 py-1 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {currentPage} / {totalPages}
            </button>

            {/* Botão Próxima */}
            <button
              onClick={goToNextPage}
              disabled={pages.findIndex(p => p.pageNum === currentPage) === pages.length - 1}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Próxima Página"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Go to Page */}
      {showGoToPage && (
        <div
          className="fixed inset-0 bg-black/50 z-30 flex items-center justify-center p-4"
          onClick={() => setShowGoToPage(false)}
        >
          <div
            className={`${currentTheme.bg} ${currentTheme.text} rounded-lg p-6 max-w-sm w-full shadow-xl`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Ir para página</h3>

            <div className="flex gap-2 mb-4">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={goToPageInput}
                onChange={(e) => setGoToPageInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleGoToPageSubmit()
                  }
                }}
                placeholder={`1 - ${totalPages}`}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleGoToPageSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Ir
              </button>
            </div>

            <button
              onClick={() => setShowGoToPage(false)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo do texto */}
      <div ref={contentRef} className="max-w-4xl mx-auto px-4 py-8 pb-24">
        {pages.length > 0 ? (
          <>
            {pages.slice(0, renderedPages).map((page, index) => (
              <div
                key={`page-${index}-${page.pageNum}`}
                ref={(el) => {
                  if (el) {
                    pageRefs.current.set(page.pageNum, el)
                  }
                }}
                className="mb-12"
              >
                {/* Marcador de Página */}
                <div className="flex items-center gap-2 mb-6 pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    Página {page.pageNum}
                  </div>
                  {totalPages > 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600">
                      / {totalPages}
                    </span>
                  )}
                </div>

                {/* Conteúdo da Página */}
                <article
                  className="prose prose-lg max-w-none text-justify prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-1 dark:prose-invert"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                  }}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className="mb-4 text-justify">{children}</p>,
                      h1: ({children}) => <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
                      h2: ({children}) => <h2 className="text-2xl font-bold mb-3 mt-5">{children}</h2>,
                      h3: ({children}) => <h3 className="text-xl font-bold mb-3 mt-4">{children}</h3>,
                      ul: ({children}) => <ul className="mb-4 ml-6 list-disc">{children}</ul>,
                      ol: ({children}) => <ol className="mb-4 ml-6 list-decimal">{children}</ol>,
                      li: ({children}) => <li className="mb-1">{children}</li>,
                    }}
                  >
                    {page.content}
                  </ReactMarkdown>
                </article>
              </div>
            ))}

            {/* Trigger para lazy loading - renderizar mais páginas */}
            {renderedPages < pages.length && (
              <div ref={loadMoreTriggerRef} className="h-4 flex items-center justify-center py-8">
                <div className="text-sm text-gray-500">Carregando mais páginas...</div>
              </div>
            )}
          </>
        ) : (
          text && (
            <article
              className="prose prose-lg max-w-none text-justify prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-1 dark:prose-invert"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: lineHeight,
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({children}) => <p className="mb-4 text-justify">{children}</p>,
                  h1: ({children}) => <h1 className="text-3xl font-bold mb-4 mt-6">{children}</h1>,
                  h2: ({children}) => <h2 className="text-2xl font-bold mb-3 mt-5">{children}</h2>,
                  h3: ({children}) => <h3 className="text-xl font-bold mb-3 mt-4">{children}</h3>,
                  ul: ({children}) => <ul className="mb-4 ml-6 list-disc">{children}</ul>,
                  ol: ({children}) => <ol className="mb-4 ml-6 list-decimal">{children}</ol>,
                  li: ({children}) => <li className="mb-1">{children}</li>,
                }}
              >
                {text}
              </ReactMarkdown>
            </article>
          )
        )}
      </div>
    </div>
  )
}
