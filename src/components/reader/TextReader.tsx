'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { Settings, Highlighter, ArrowLeft, Eye, EyeOff, Clock } from 'lucide-react'
import { TiptapReader } from './TiptapReader'
import { FloatingAnnotationMenu } from './FloatingAnnotationMenu'
import { useMobileText } from '@/hooks/useMobileText'
import { useReaderPreferences } from '@/hooks/useReaderPreferences'
import { useReadingProgress } from '@/hooks/useReadingProgress'
import { usePdfBatchProcessing } from '@/hooks/usePdfBatchProcessing'
import { ReaderSettings } from './ReaderSettings'
import { ReaderProgressBar } from './ReaderProgressBar'
import { PageNavigator } from './PageNavigator'
import { ProcessingProgressBar } from './ProcessingProgressBar'
import type { Annotation } from './types'
import {
  THEME_CONFIGS,
  COLUMN_WIDTH_VALUES,
  LINE_HEIGHT_VALUES,
  FONT_FAMILIES,
} from './types'

interface TextReaderProps {
  materialId: string
}

interface PageData {
  pageNum: number
  content: string
  startOffset: number
  endOffset: number
}

export function TextReader({ materialId }: TextReaderProps) {
  const { text, loading, error, metadata, refetch } = useMobileText(materialId)
  const { preferences, updatePreference, isLoaded } = useReaderPreferences()
  const { stats, timeSpent, restorePosition } = useReadingProgress({
    materialId,
    textLength: text?.length || 0,
  })

  // Hook de processamento em lotes (apenas para status, processamento acontece no servidor)
  const {
    status: processingStatus,
    isProcessing,
    error: processingError,
  } = usePdfBatchProcessing({
    materialId,
    batchSize: 10,
    initialBatchSize: 5,
  })

  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedText, setSelectedText] = useState('')
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(
    null
  )
  const [showHighlightMenu, setShowHighlightMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAnnotationsPanel, setShowAnnotationsPanel] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [processError, setProcessError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [renderedPages, setRenderedPages] = useState(5) // Inicialmente renderizar apenas 5 páginas
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null)

  const textContainerRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const scrollPositionRef = useRef<number>(0)
  const isNavigatingRef = useRef<boolean>(false) // Rastrear se já está navegando
  const previousTextLengthRef = useRef<number>(0)

  // Gerenciamento de editores Tiptap
  const editorsRef = useRef<Map<number, any>>(new Map())
  const [activeEditor, setActiveEditor] = useState<any>(null)

  // Estado para menu de sublinhado
  const [showUnderlineMenu, setShowUnderlineMenu] = useState(false)
  const [underlineStyle, setUnderlineStyle] = useState('solid')
  const [underlineThickness, setUnderlineThickness] = useState('2px')
  const [underlineColor, setUnderlineColor] = useState('#3b82f6')

  // Estado para menu flutuante de anotação
  const [showFloatingMenu, setShowFloatingMenu] = useState(false)
  const [floatingMenuPosition, setFloatingMenuPosition] = useState<{ x: number; y: number } | null>(null)

  // Estado para salvamento de progresso
  const [savingProgress, setSavingProgress] = useState(false)

  // Estado para restauração de posição
  const [isRestoringPosition, setIsRestoringPosition] = useState(false)
  const [targetPageToRestore, setTargetPageToRestore] = useState<number | null>(null)

  const theme = THEME_CONFIGS[preferences.theme]

  // Calcular largura efetiva (usa custom se definido, senão usa preset)
  const effectiveWidth = useMemo(() => {
    if (preferences.columnWidthCustom) {
      return `${preferences.columnWidthCustom}px`
    }
    return COLUMN_WIDTH_VALUES[preferences.columnWidth]
  }, [preferences.columnWidthCustom, preferences.columnWidth])

  // Processar texto para extrair páginas
  const pages = useMemo(() => {
    if (!text) return []

    const pageRegex = /\[PAGE_(\d+)\]/g
    const pagesData: PageData[] = []
    let match
    let lastIndex = 0
    let pageNumber = 1
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
      // Se NÃO tem marcadores, dividir automaticamente em chunks
      // Dividir por seções (## ou #) ou por tamanho máximo
      const CHARS_PER_CHUNK = 4000 // ~2-3 telas mobile
      const sections = text.split(/(?=\n#{1,2} )/g) // Split antes de headers

      let currentChunk = ''
      let currentOffset = 0

      for (const section of sections) {
        if (currentChunk.length + section.length > CHARS_PER_CHUNK && currentChunk) {
          // Salvar chunk atual
          pagesData.push({
            pageNum: pageNumber,
            content: currentChunk.trim(),
            startOffset: currentOffset,
            endOffset: currentOffset + currentChunk.length,
          })
          pageNumber++
          currentOffset += currentChunk.length
          currentChunk = section
        } else {
          currentChunk += section
        }
      }

      // Adicionar último chunk
      if (currentChunk.trim()) {
        pagesData.push({
          pageNum: pageNumber,
          content: currentChunk.trim(),
          startOffset: currentOffset,
          endOffset: text.length,
        })
      }
    }

    // Definir totalPages como o número da última página (ou quantidade de páginas se não houver marcadores)
    if (pagesData.length > 0) {
      const lastPage = pagesData[pagesData.length - 1]
      setTotalPages(lastPage.pageNum)

      // Log para debug
      console.log('📄 Páginas extraídas:', pagesData.map(p => p.pageNum).join(', '))
      console.log('📄 Total de páginas (última):', lastPage.pageNum)
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

  // Buscar histórico ANTES de processar páginas (para ativar loading)
  useEffect(() => {
    if (!text) {
      return
    }

    const fetchHistoryEarly = async () => {
      try {
        console.log('📡 Buscando histórico de leitura antecipadamente...')

        const response = await fetch(`/api/material/${materialId}/historico-leitura`)
        if (!response.ok) {
          console.error('❌ Erro ao buscar histórico:', response.statusText)
          return
        }

        const result = await response.json()
        console.log('📊 Histórico recebido:', result)

        if (result.success && result.historico && result.historico.length > 0) {
          const ultimoHistorico = result.historico[0]
          const paginaParaIr = ultimoHistorico.paginaAtual

          // Ativar estado de restauração ANTES das páginas serem processadas
          setIsRestoringPosition(true)
          setTargetPageToRestore(paginaParaIr)
          console.log(`📍 Página alvo para restaurar: ${paginaParaIr} - Loading ativado`)
        } else {
          console.log('ℹ️ Nenhum histórico de leitura salvo')
        }
      } catch (err) {
        console.error('❌ Erro ao buscar histórico:', err)
      }
    }

    fetchHistoryEarly()
  }, [materialId, text])

  // useEffect 1: Garantir que páginas suficientes estejam renderizadas
  useEffect(() => {
    if (!isRestoringPosition || !targetPageToRestore || pages.length === 0) {
      return
    }

    console.log(`🔧 [useEffect 1] Verificando renderização. Target: ${targetPageToRestore}, renderedPages: ${renderedPages}, pages.length: ${pages.length}`)

    // Verificar se a página alvo já foi processada
    let pageIndex = pages.findIndex(p => p.pageNum === targetPageToRestore)

    if (pageIndex === -1) {
      // Página exata não encontrada - procurar a mais próxima ANTES da alvo
      const pagesBefore = pages.filter(p => p.pageNum < targetPageToRestore)
      if (pagesBefore.length > 0) {
        const closestPage = pagesBefore[pagesBefore.length - 1]
        pageIndex = pages.findIndex(p => p.pageNum === closestPage.pageNum)
        console.log(`📍 Página ${targetPageToRestore} não encontrada, usando página mais próxima: ${closestPage.pageNum} (pageIndex: ${pageIndex})`)
      } else {
        console.log(`⏳ Aguardando mais páginas serem processadas... (alvo: ${targetPageToRestore})`)
        return
      }
    } else {
      console.log(`✅ Página ${targetPageToRestore} encontrada no array! pageIndex: ${pageIndex}`)
    }

    // Renderizar até essa página se necessário
    const pagesNeeded = pageIndex + 1
    if (pagesNeeded > renderedPages) {
      console.log(`🔄 [useEffect 1] AUMENTANDO renderedPages: ${renderedPages} → ${pagesNeeded}`)
      setRenderedPages(pagesNeeded)
    } else {
      console.log(`✓ [useEffect 1] Já renderizado suficiente: renderedPages=${renderedPages}, needed=${pagesNeeded}`)
    }
  }, [pages, targetPageToRestore, isRestoringPosition, renderedPages])

  // useEffect 2: Aguardar página aparecer no DOM e fazer scroll
  useEffect(() => {
    if (!isRestoringPosition || !targetPageToRestore || pages.length === 0) {
      return
    }

    // Se já está navegando, não iniciar outro polling
    if (isNavigatingRef.current) {
      console.log('⏭️ Já está navegando, pulando...')
      return
    }

    // Marcar IMEDIATAMENTE que está tentando navegar para evitar duplicação
    isNavigatingRef.current = true
    console.log('🔒 Marcado como navegando')

    // Determinar qual página navegar
    let pageIndex = pages.findIndex(p => p.pageNum === targetPageToRestore)
    let pageToNavigate = targetPageToRestore

    if (pageIndex === -1) {
      const pagesBefore = pages.filter(p => p.pageNum < targetPageToRestore)
      if (pagesBefore.length > 0) {
        const closestPage = pagesBefore[pagesBefore.length - 1]
        pageToNavigate = closestPage.pageNum
        pageIndex = pages.findIndex(p => p.pageNum === closestPage.pageNum)
      } else {
        isNavigatingRef.current = false // Reset antes de sair
        return
      }
    }

    // Se ainda precisa renderizar mais páginas, aguardar
    if (pageIndex >= renderedPages) {
      console.log(`⏸️ Aguardando renderização... (pageIndex: ${pageIndex}, renderedPages: ${renderedPages})`)
      isNavigatingRef.current = false // Reset - vai tentar novamente quando renderizar
      return
    }

    console.log(`🎯 Iniciando busca pela página ${pageToNavigate} no DOM...`)

    let attempts = 0
    const maxAttempts = 50
    let intervalId: NodeJS.Timeout | null = null

    const checkAndScroll = () => {
      attempts++
      const pageElement = pageRefs.current.get(pageToNavigate)
      const refKeys = Array.from(pageRefs.current.keys())

      console.log(`🔍 [${attempts}/${maxAttempts}] Procurando #${pageToNavigate}. Refs: [${refKeys.join(', ')}]`)

      if (pageElement) {
        const hasContent = pageElement.querySelector('.tiptap') !== null
        const contentLength = pageElement.textContent?.length || 0

        console.log(`📄 Elemento #${pageToNavigate} encontrado! hasContent=${hasContent}, chars=${contentLength}`)

        if (hasContent && contentLength > 10) {
          console.log(`✅ Fazendo scroll para página ${pageToNavigate}...`)
          if (intervalId) clearInterval(intervalId)

          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setCurrentPage(pageToNavigate)

          setTimeout(() => {
            console.log(`✅ Navegação completa! Desativando loading.`)
            setIsRestoringPosition(false)
            setTargetPageToRestore(null)
            isNavigatingRef.current = false // Reset para permitir futuras navegações
          }, 1500)
        } else if (attempts >= maxAttempts) {
          console.warn(`⚠️ TIMEOUT: Conteúdo não renderizou`)
          if (intervalId) clearInterval(intervalId)
          setIsRestoringPosition(false)
          setTargetPageToRestore(null)
          isNavigatingRef.current = false // Reset
        }
      } else if (attempts >= maxAttempts) {
        console.warn(`⚠️ TIMEOUT: Elemento não encontrado`)
        if (intervalId) clearInterval(intervalId)
        setIsRestoringPosition(false)
        setTargetPageToRestore(null)
        isNavigatingRef.current = false // Reset
      }
    }

    intervalId = setInterval(checkAndScroll, 100)
    checkAndScroll()

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [pages, targetPageToRestore, isRestoringPosition, renderedPages]) // Agora SIM inclui renderedPages!

  // Buscar anotações
  useEffect(() => {
    if (materialId) {
      fetchAnnotations()
    }
  }, [materialId])

  // 📍 PRESERVAR POSIÇÃO DO SCROLL - Salvar periodicamente
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollableElement = document.querySelector('main') || document.documentElement
      if (scrollableElement) {
        scrollPositionRef.current = scrollableElement.scrollTop || window.pageYOffset
      }
    }

    // Salvar a cada 500ms durante scroll
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(saveScrollPosition, 500)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.querySelector('main')?.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.querySelector('main')?.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  // 🔄 RESTAURAR POSIÇÃO DO SCROLL - Quando texto é atualizado
  useEffect(() => {
    if (!text) return

    const currentTextLength = text.length
    const previousTextLength = previousTextLengthRef.current

    // Se o texto aumentou (novas páginas foram adicionadas)
    if (currentTextLength > previousTextLength && previousTextLength > 0) {
      console.log('📄 Novas páginas adicionadas, restaurando posição do scroll...')

      // Aguardar o DOM atualizar
      requestAnimationFrame(() => {
        const scrollableElement = document.querySelector('main') || document.documentElement
        if (scrollableElement && scrollPositionRef.current > 0) {
          scrollableElement.scrollTop = scrollPositionRef.current
          window.scrollTo(0, scrollPositionRef.current)
          console.log(`✅ Posição restaurada: ${scrollPositionRef.current}px`)
        }
      })
    }

    // Atualizar comprimento anterior
    previousTextLengthRef.current = currentTextLength
  }, [text])

  const fetchAnnotations = async () => {
    try {
      const response = await fetch(`/api/annotations/${materialId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAnnotations(data.data)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar anotações:', err)
    }
  }

  const handleHighlightCreate = async (annotation: { texto: string; cor: string; startOffset: number; endOffset: number }) => {
    try {
      const response = await fetch('/api/annotations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          texto: annotation.texto,
          cor: annotation.cor,
          tipo: 'highlight',
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // Atualizar lista de anotações
          await fetchAnnotations()
        }
      }
    } catch (err) {
      console.error('Erro ao salvar anotação:', err)
    }
  }

  // Salvar progresso de leitura
  const handleSaveProgress = async () => {
    if (savingProgress) return

    setSavingProgress(true)
    try {
      // Salvar progresso de leitura
      const response = await fetch(`/api/material/${materialId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginasLidas: currentPage,
        }),
      })

      if (response.ok) {
        console.log('Progresso salvo com sucesso')
      }

      // Salvar histórico de leitura
      const historicoResponse = await fetch(`/api/material/${materialId}/historico-leitura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginaAtual: currentPage,
          tempoLeituraSegundos: timeSpent,
          assuntosEstudados: null,
        }),
      })

      if (historicoResponse.ok) {
        console.log('Histórico de leitura salvo com sucesso')
        // Mostrar mensagem de sucesso (você pode adicionar um toast aqui se quiser)
        alert(`Progresso salvo - Página ${currentPage} - Tempo: ${Math.floor(timeSpent / 60)}:${(timeSpent % 60).toString().padStart(2, '0')}`)
      }
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
      alert('Erro ao salvar progresso')
    } finally {
      setSavingProgress(false)
    }
  }

  // Processar PDF com IA
  const processarPDF = async () => {
    setProcessing(true)
    setProcessError(null)

    try {
      const response = await fetch('/api/pdf/format-for-reader', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar PDF')
      }

      const data = await response.json()

      if (data.success) {
        await refetch()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setProcessError(errorMessage)
      console.error('Erro ao processar PDF:', err)
    } finally {
      setProcessing(false)
    }
  }

  // Criar highlight
  const createHighlight = async (color: string) => {
    if (!selectionRange || !selectedText) return

    try {
      const response = await fetch('/api/annotations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
          texto: selectedText,
          startOffset: selectionRange.start,
          endOffset: selectionRange.end,
          cor: color,
          tipo: 'highlight',
        }),
      })

      if (response.ok) {
        await fetchAnnotations()
        setShowHighlightMenu(false)
        window.getSelection()?.removeAllRanges()
      }
    } catch (err) {
      console.error('Erro ao criar highlight:', err)
    }
  }

  // Deletar anotação
  const deleteAnnotation = async (annotationId: string) => {
    try {
      console.log('🗑️ Tentando deletar anotação:', annotationId)

      const response = await fetch(`/api/annotations/delete/${annotationId}`, {
        method: 'DELETE',
      })

      console.log('📡 Resposta do servidor:', response.status, response.statusText)

      const textResponse = await response.text()
      console.log('📄 Resposta em texto:', textResponse)

      if (response.ok) {
        let data
        try {
          data = JSON.parse(textResponse)
          console.log('✅ Anotação deletada com sucesso:', data)
        } catch (parseErr) {
          console.log('⚠️ Resposta não é JSON, mas status OK')
        }

        // Recarregar as anotações sem refresh da página
        await fetchAnnotations()
      } else {
        let errorData
        try {
          errorData = JSON.parse(textResponse)
          console.error('❌ Erro ao deletar:', errorData)
          alert(`Erro ao deletar anotação: ${errorData.error || 'Erro desconhecido'}`)
        } catch (parseErr) {
          console.error('❌ Erro ao deletar (resposta não-JSON):', textResponse)
          alert(`Erro ao deletar anotação: ${textResponse}`)
        }
      }
    } catch (err) {
      console.error('❌ Erro completo ao deletar anotação:', err)
      console.error('Tipo do erro:', err instanceof Error ? err.message : String(err))
      alert(`Erro ao deletar anotação: ${err instanceof Error ? err.message : 'Erro desconhecido'}`)
    }
  }

  // Navegar para uma página específica
  const goToPage = (pageNum: number) => {
    const pageElement = pageRefs.current.get(pageNum)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setCurrentPage(pageNum)
    }
  }

  // Scroll para uma anotação específica
  const scrollToAnnotation = (annotation: Annotation) => {
    console.log('📍 Navegando para anotação:', annotation)

    // Encontrar em qual página está a anotação
    const pageWithAnnotation = pages.find(
      (page) =>
        annotation.startOffset >= page.startOffset && annotation.startOffset < page.endOffset
    )

    if (!pageWithAnnotation) {
      console.log('⚠️ Página da anotação não encontrada')
      return
    }

    console.log('📄 Anotação está na página:', pageWithAnnotation.pageNum)

    // Primeiro, fazer scroll para a página
    const pageElement = pageRefs.current.get(pageWithAnnotation.pageNum)
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Aguardar o scroll terminar e então destacar a anotação temporariamente
      setTimeout(() => {
        const editor = editorsRef.current.get(pageWithAnnotation.pageNum)
        if (editor) {
          // Calcular offset relativo à página
          const relativeStart = annotation.startOffset - pageWithAnnotation.startOffset
          const relativeEnd = annotation.endOffset - pageWithAnnotation.startOffset

          try {
            // Selecionar temporariamente o texto da anotação para dar destaque visual
            editor.chain().setTextSelection({ from: relativeStart, to: relativeEnd }).run()

            // Limpar seleção após 2 segundos
            setTimeout(() => {
              editor.commands.setTextSelection(0)
            }, 2000)
          } catch (err) {
            console.error('Erro ao destacar anotação:', err)
          }
        }
      }, 500) // Aguardar scroll suave completar
    }
  }

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

  // REMOVIDO: Processamento sob demanda no scroll
  // Agora o processamento acontece automaticamente no servidor após o upload
  // O cliente apenas visualiza o texto já processado

  // Lazy loading - renderizar mais páginas quando o usuário scrolla
  useEffect(() => {
    const trigger = loadMoreTriggerRef.current
    if (!trigger || pages.length <= renderedPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && renderedPages < pages.length) {
          console.log(`📄 Carregando mais páginas... (${renderedPages}/${pages.length})`)
          setRenderedPages((prev) => Math.min(prev + 3, pages.length)) // Carregar 3 páginas por vez
        }
      },
      { rootMargin: '500px' } // Carregar quando estiver a 500px do trigger
    )

    observer.observe(trigger)

    return () => {
      observer.disconnect()
    }
  }, [pages.length, renderedPages])

  // Detectar página visível no viewport e atualizar currentPage
  useEffect(() => {
    if (pages.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Encontrar a página com maior intersecção visível
        let maxIntersectionRatio = 0
        let mostVisiblePageNum = currentPage

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio
            // Extrair número da página do data-attribute
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') || '1')
            mostVisiblePageNum = pageNum
          }
        })

        // Atualizar currentPage se mudou
        if (maxIntersectionRatio > 0 && mostVisiblePageNum !== currentPage) {
          setCurrentPage(mostVisiblePageNum)
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1.0], // Observar em múltiplos pontos
        rootMargin: '-10% 0px -10% 0px', // Dar margem superior/inferior
      }
    )

    // Observar todas as páginas renderizadas
    pageRefs.current.forEach((pageElement) => {
      if (pageElement) {
        observer.observe(pageElement)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [pages.length, renderedPages, currentPage])

  // Aplicar highlights ao texto de uma página específica
  const renderTextWithHighlights = (content: string, pageStartOffset: number, pageEndOffset: number) => {
    // Filtrar anotações que estão nesta página
    const pageAnnotations = annotations.filter(
      (ann) =>
        (ann.startOffset >= pageStartOffset && ann.startOffset < pageEndOffset) ||
        (ann.endOffset > pageStartOffset && ann.endOffset <= pageEndOffset)
    )

    // Se não tem anotações, retornar conteúdo direto
    if (!pageAnnotations.length) {
      return content
    }

    // Aplicar highlights usando offsets originais
    const sortedAnnotations = [...pageAnnotations].sort((a, b) => a.startOffset - b.startOffset)
    let result = ''
    let lastIndex = 0

    sortedAnnotations.forEach((annotation) => {
      // Ajustar offsets relativos à página
      const relativeStart = Math.max(0, annotation.startOffset - pageStartOffset)
      const relativeEnd = Math.min(content.length, annotation.endOffset - pageStartOffset)

      result += content.substring(lastIndex, relativeStart)

      const highlightedText = content.substring(relativeStart, relativeEnd)
      result += `<mark style="background-color: ${annotation.cor}; padding: 2px 0; cursor: pointer;" data-annotation-id="${annotation.id}">${highlightedText}</mark>`

      lastIndex = relativeEnd
    })

    result += content.substring(lastIndex)
    return result
  }

  // Loading state - consolidado em um único loading
  // Mostra loading em qualquer uma das situações:
  // 1. Texto ainda não carregado (!text)
  // 2. Restaurando posição de leitura (mantém loading até navegação completa)
  // 3. Texto carregado mas páginas ainda não processadas (apenas se NÃO estiver restaurando)
  // 4. Hook ainda carregando (loading do useMobileText)
  // REMOVIDO: isProcessing - processamento agora é invisível em background
  const shouldShowLoading = loading || !text || isRestoringPosition || (!isRestoringPosition && pages.length === 0)

  // Renderizar loading como overlay em vez de return
  const loadingOverlay = shouldShowLoading && (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 transition-colors"
      style={{ backgroundColor: theme.bg }}
    >
      <div className="text-center p-8 max-w-md">
          {/* Spinner animado */}
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>

          {/* Mensagem principal */}
          <h3 className="text-2xl font-bold mb-3" style={{ color: theme.text }}>
            {isRestoringPosition && targetPageToRestore
              ? `Navegando para página ${targetPageToRestore}`
              : loading
              ? 'Preparando material'
              : !text
              ? 'Processando texto'
              : pages.length === 0
              ? 'Organizando conteúdo'
              : 'Carregando material'}
          </h3>

          <p className="text-base mb-4" style={{ color: theme.secondary }}>
            {isRestoringPosition && targetPageToRestore
              ? 'Restaurando sua posição de leitura...'
              : loading
              ? 'Carregando e processando o PDF...'
              : !text
              ? 'Formatando o texto para leitura...'
              : pages.length === 0
              ? 'Organizando o conteúdo em páginas...'
              : 'Preparando o conteúdo para você...'
            }
          </p>

          {/* Barra de progresso indeterminada */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 animate-progress"></div>
          </div>

          <p className="text-sm mt-4" style={{ color: theme.secondary, opacity: 0.7 }}>
            Aguarde alguns instantes...
          </p>
        </div>
      </div>
    )

  // Error state (PDF não processado) - REMOVIDO
  // Agora tratamos tudo via shouldShowLoading, mantendo loading contínuo
  // até que o texto esteja disponível

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300"
      style={{
        backgroundColor: theme.bg,
        color: theme.text,
        fontFamily: FONT_FAMILIES[preferences.fontFamily],
        paddingTop: 0,
      }}
    >
      {/* Loading Overlay - permite renderização de fundo */}
      {loadingOverlay}


      {/* Toolbar Estilo Adobe PDF/Okular */}
      {!focusMode && (
        <div
          className="sticky top-0 z-20 shadow-md"
          style={{
            backgroundColor: preferences.theme === 'dark' ? '#2d2d2d' : '#f3f3f3',
            borderBottom: `1px solid ${preferences.theme === 'dark' ? '#3d3d3d' : '#d1d1d1'}`
          }}
        >
          <div className="flex items-center justify-between px-4 py-2">
            {/* Grupo Esquerdo: Navegação */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.history.back()}
                className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
              </button>

              <div className="w-px h-6 bg-black/20 dark:bg-white/20 mx-1" />

              <button
                onClick={() => setFocusMode(!focusMode)}
                className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label={focusMode ? "Sair do Modo Foco" : "Modo Foco"}
                title={focusMode ? "Sair do Modo Foco" : "Modo Foco"}
              >
                {focusMode ? (
                  <Eye className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
                ) : (
                  <EyeOff className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
                )}
              </button>
            </div>

            {/* Centro: Ferramentas de Anotação */}
            {activeEditor && (
              <div className="flex items-center gap-2">
                {/* Cores de Highlight */}
                {[
                  { color: '#fef08a', title: 'Amarelo' },
                  { color: '#bbf7d0', title: 'Verde' },
                  { color: '#bfdbfe', title: 'Azul' },
                  { color: '#fecaca', title: 'Vermelho' },
                ].map((item) => (
                  <button
                    key={item.color}
                    onClick={() => activeEditor.chain().focus().toggleHighlight({ color: item.color }).run()}
                    className="w-7 h-7 rounded border-2 transition-all hover:scale-110 shadow-sm"
                    style={{
                      backgroundColor: item.color,
                      borderColor: activeEditor.isActive('highlight', { color: item.color })
                        ? '#2196F3'
                        : preferences.theme === 'dark' ? '#4a4a4a' : '#bdbdbd',
                      opacity: activeEditor.isActive('highlight', { color: item.color }) ? 1 : 0.7,
                    }}
                    title={`Destacar ${item.title}`}
                    aria-label={`Destacar ${item.title}`}
                  />
                ))}

                <div className="w-px h-6 bg-black/20 dark:bg-white/20 mx-1" />

                {/* Sublinhar */}
                <button
                  onClick={() => setShowUnderlineMenu(!showUnderlineMenu)}
                  className="px-3 py-1.5 rounded border transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: activeEditor.isActive('customUnderline') || showUnderlineMenu
                      ? (preferences.theme === 'dark' ? '#3d3d3d' : '#e0e0e0')
                      : 'transparent',
                    borderColor: activeEditor.isActive('customUnderline') || showUnderlineMenu
                      ? '#2196F3'
                      : (preferences.theme === 'dark' ? '#4a4a4a' : '#bdbdbd'),
                    color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242',
                  }}
                  title="Sublinhar"
                  aria-label="Sublinhar"
                >
                  <span style={{ textDecoration: 'underline', fontSize: '14px', fontWeight: '500' }}>U</span>
                </button>

                {/* Riscar */}
                <button
                  onClick={() => activeEditor.chain().focus().toggleStrike().run()}
                  className="px-3 py-1.5 rounded border transition-all hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: activeEditor.isActive('strike')
                      ? (preferences.theme === 'dark' ? '#3d3d3d' : '#e0e0e0')
                      : 'transparent',
                    borderColor: activeEditor.isActive('strike')
                      ? '#2196F3'
                      : (preferences.theme === 'dark' ? '#4a4a4a' : '#bdbdbd'),
                    color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242',
                  }}
                  title="Riscar"
                  aria-label="Riscar"
                >
                  <span style={{ textDecoration: 'line-through', fontSize: '14px', fontWeight: '500' }}>S</span>
                </button>

              </div>
            )}

            {/* Grupo Direito: Utilidades */}
            <div className="flex items-center gap-2">
              {/* Informações de Leitura */}
              <div className="flex items-center gap-3 px-3 text-xs" style={{ color: preferences.theme === 'dark' ? '#b0b0b0' : '#666' }}>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium">
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">
                    {stats.scrollPercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="hidden xl:flex items-center gap-1.5">
                  <span>
                    {stats.wordsRead.toLocaleString()} / {stats.totalWords.toLocaleString()} palavras
                  </span>
                </div>
              </div>

              <div className="w-px h-6 bg-black/20 dark:bg-white/20" />

              <button
                onClick={() => setShowAnnotationsPanel(!showAnnotationsPanel)}
                className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors relative"
                aria-label="Anotações"
                title="Ver Anotações"
              >
                <Highlighter className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
                {annotations.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-blue-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {annotations.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleSaveProgress}
                disabled={savingProgress}
                className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                aria-label="Marcar Progresso"
                title="Marcar Progresso"
              >
                <Clock className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Configurações"
                title="Configurações"
              >
                <Settings className="w-5 h-5" style={{ color: preferences.theme === 'dark' ? '#e0e0e0' : '#424242' }} />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Menu de Highlight - Design Elegante - DESABILITADO PARA TESTAR TIPTAP NATIVO */}
      {false && showHighlightMenu && !focusMode && (
        <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-[60] backdrop-blur-md bg-white/95 shadow-xl rounded-2xl px-5 py-4 border border-gray-200/50">
          <p className="text-xs text-gray-500 mb-3 font-medium tracking-wide uppercase">Destacar</p>
          <div className="flex flex-col gap-2.5">
            {[
              { color: '#ffff00', label: 'Amarelo' },
              { color: '#90EE90', label: 'Verde' },
              { color: '#FFB6C1', label: 'Rosa' },
              { color: '#87CEEB', label: 'Azul' },
              { color: '#DDA0DD', label: 'Roxo' },
            ].map((item) => (
              <button
                key={item.color}
                onClick={() => createHighlight(item.color)}
                className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-all hover:scale-110 shadow-sm"
                style={{ backgroundColor: item.color }}
                aria-label={item.label}
                title={item.label}
              />
            ))}
            <div className="w-px h-8 bg-gray-300 mx-1" />
            <button
              onClick={() => setShowHighlightMenu(false)}
              className="px-3 py-2 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Painel de Anotações */}
      {showAnnotationsPanel && !focusMode && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-40 overflow-y-auto border-l">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Anotações ({annotations.length})</h3>
              <button
                onClick={() => setShowAnnotationsPanel(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            {annotations.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhuma anotação ainda. Selecione um texto para destacar!
              </p>
            ) : (
              <div className="space-y-3">
                {annotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    style={{ backgroundColor: `${annotation.cor}20` }}
                    onClick={() => scrollToAnnotation(annotation)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-gray-800 flex-1">{annotation.texto}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation() // Prevenir o scroll quando clicar em deletar
                          deleteAnnotation(annotation.id)
                        }}
                        className="text-red-600 hover:text-red-800 text-xs shrink-0"
                      >
                        Deletar
                      </button>
                    </div>
                    <div
                      className="mt-2 w-full h-1 rounded"
                      style={{ backgroundColor: annotation.cor }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Painel de Configurações */}
      <ReaderSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        preferences={preferences}
        onUpdatePreference={updatePreference}
      />

      {/* Menu de Sublinhado */}
      {showUnderlineMenu && activeEditor && !focusMode && (
        <div
          className="fixed right-6 top-24 z-50 p-4 rounded-lg shadow-xl"
          style={{
            backgroundColor: theme.bg,
            border: `2px solid ${theme.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: theme.text }}>Opções de Sublinhado</h3>
            <button
              onClick={() => setShowUnderlineMenu(false)}
              className="p-1 rounded hover:bg-opacity-10 hover:bg-gray-500"
              style={{ color: theme.text }}
            >
              ✕
            </button>
          </div>

          {/* Traçado */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-2" style={{ color: theme.secondary }}>Traçado</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'solid', label: 'Sólido' },
                { value: 'dashed', label: 'Tracejado' },
                { value: 'dotted', label: 'Pontilhado' },
                { value: 'wavy', label: 'Ondulado' },
              ].map((style) => (
                <button
                  key={style.value}
                  onClick={() => setUnderlineStyle(style.value)}
                  className="px-3 py-2 rounded text-xs font-medium transition-all"
                  style={{
                    backgroundColor: underlineStyle === style.value ? `${theme.accent}20` : 'transparent',
                    color: underlineStyle === style.value ? theme.accent : theme.text,
                    border: `1px solid ${underlineStyle === style.value ? theme.accent : theme.border}`,
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Espessura */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-2" style={{ color: theme.secondary }}>Espessura</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: '1px', label: 'Fina' },
                { value: '2px', label: 'Média' },
                { value: '3px', label: 'Grossa' },
              ].map((thick) => (
                <button
                  key={thick.value}
                  onClick={() => setUnderlineThickness(thick.value)}
                  className="px-3 py-2 rounded text-xs font-medium transition-all"
                  style={{
                    backgroundColor: underlineThickness === thick.value ? `${theme.accent}20` : 'transparent',
                    color: underlineThickness === thick.value ? theme.accent : theme.text,
                    border: `1px solid ${underlineThickness === thick.value ? theme.accent : theme.border}`,
                  }}
                >
                  {thick.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div className="mb-3">
            <label className="text-xs font-medium block mb-2" style={{ color: theme.secondary }}>Cor</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: '#3b82f6', label: 'Azul' },
                { value: '#ef4444', label: 'Vermelho' },
                { value: '#10b981', label: 'Verde' },
                { value: '#f59e0b', label: 'Laranja' },
                { value: '#8b5cf6', label: 'Roxo' },
                { value: '#ec4899', label: 'Rosa' },
                { value: '#000000', label: 'Preto' },
                { value: '#6b7280', label: 'Cinza' },
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={() => setUnderlineColor(color.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color.value,
                    borderColor: underlineColor === color.value ? theme.accent : theme.border,
                  }}
                  title={color.label}
                  aria-label={color.label}
                />
              ))}
            </div>
          </div>

          {/* Botão Aplicar */}
          <button
            onClick={() => {
              activeEditor.chain().focus().toggleCustomUnderline({
                style: underlineStyle,
                thickness: underlineThickness,
                color: underlineColor,
              }).run()
              setShowUnderlineMenu(false)
            }}
            className="w-full py-2 rounded font-medium transition-all"
            style={{
              backgroundColor: theme.accent,
              color: '#ffffff',
            }}
          >
            Aplicar Sublinhado
          </button>
        </div>
      )}

      {/* Conteúdo do Texto */}
      <div
        className="flex-1 transition-all duration-300"
        style={{
          maxWidth: effectiveWidth,
          margin: '0 auto',
          width: '100%',
          padding: focusMode ? '4rem 0.5rem' : '1.5rem 0.5rem',
        }}
      >
        <div ref={textContainerRef}>
          {pages.length > 0 && (
            <>
            {(() => {
              const slicedPages = pages.slice(0, renderedPages)
              console.log(`🎨 [RENDER] Renderizando ${slicedPages.length} páginas (renderedPages=${renderedPages}, pages.length=${pages.length})`)
              console.log(`🎨 [RENDER] Páginas a renderizar:`, slicedPages.map(p => p.pageNum))
              return slicedPages
            })().map((page, index) => (
              <div
                key={`page-${index}-${page.pageNum}`}
                data-page-num={page.pageNum}
                ref={(el) => {
                  if (el) {
                    console.log(`📌 [REF] Registrando página ${page.pageNum} no pageRefs`)
                    pageRefs.current.set(page.pageNum, el)
                    console.log(`📌 [REF] pageRefs agora tem ${pageRefs.current.size} páginas:`, Array.from(pageRefs.current.keys()))
                  } else {
                    console.log(`📌 [REF] Removendo página ${page.pageNum} do pageRefs`)
                  }
                }}
                className="page-content mb-8"
              >
                {/* Marcador de Página */}
                <div
                  className="flex items-center gap-2 mb-6 pb-2 border-b"
                  style={{ borderColor: theme.border }}
                >
                  <div
                    className="px-2.5 py-0.5 rounded-md text-xs font-medium"
                    style={{
                      backgroundColor: `${theme.text}15`,
                      color: theme.text,
                    }}
                  >
                    Página {page.pageNum}
                  </div>
                  {totalPages > 0 && (
                    <span className="text-[10px]" style={{ color: theme.secondary }}>
                      / {totalPages}
                    </span>
                  )}
                </div>

                {/* Conteúdo da Página */}
                <TiptapReader
                  content={page.content}
                  preferences={preferences}
                  annotations={annotations}
                  pageStartOffset={page.startOffset}
                  onTextSelect={(text, position, from, to) => {
                    setSelectedText(text)
                    setFloatingMenuPosition(position)
                    setShowFloatingMenu(true)
                    // Calcular offset global baseado na página
                    setSelectionRange({
                      start: page.startOffset + from,
                      end: page.startOffset + to,
                    })
                  }}
                  onSelectionClear={() => {
                    setShowFloatingMenu(false)
                    setFloatingMenuPosition(null)
                    setSelectionRange(null)
                  }}
                  onEditorReady={(editor) => {
                    editorsRef.current.set(page.pageNum, editor)
                    // Se não há editor ativo, define este como ativo
                    if (!activeEditor) {
                      setActiveEditor(editor)
                    }
                  }}
                  onEditorFocus={() => {
                    const editor = editorsRef.current.get(page.pageNum)
                    if (editor) {
                      setActiveEditor(editor)
                    }
                  }}
                  onHighlightCreate={handleHighlightCreate}
                />
              </div>
            ))}

            {/* Trigger para lazy loading - renderizar mais páginas */}
            {renderedPages < pages.length && (
              <div
                ref={loadMoreTriggerRef}
                className="h-4"
              />
            )}
            </>
          )}

          {/* Mensagem se não há páginas */}
          {pages.length === 0 && text && (
            <TiptapReader
              content={text || ''}
              preferences={preferences}
              annotations={annotations}
              pageStartOffset={0}
              onTextSelect={(text, position, from, to) => {
                setSelectedText(text)
                setFloatingMenuPosition(position)
                setShowFloatingMenu(true)
                setSelectionRange({
                  start: from,
                  end: to,
                })
              }}
              onSelectionClear={() => {
                setShowFloatingMenu(false)
                setFloatingMenuPosition(null)
                setSelectionRange(null)
              }}
              onEditorReady={(editor) => {
                editorsRef.current.set(0, editor)
                if (!activeEditor) {
                  setActiveEditor(editor)
                }
              }}
              onEditorFocus={() => {
                const editor = editorsRef.current.get(0)
                if (editor) {
                  setActiveEditor(editor)
                }
              }}
              onHighlightCreate={handleHighlightCreate}
            />
          )}
        </div>
      </div>

      {/* Navegador de Páginas */}
      {!focusMode && totalPages > 1 && (
        <PageNavigator
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          theme={theme}
        />
      )}

      {/* Barra de Progresso de Leitura */}
      {!focusMode && (
        <ReaderProgressBar
          percentage={stats.scrollPercentage}
          wordsRead={stats.wordsRead}
          totalWords={stats.totalWords}
          estimatedTimeLeft={stats.estimatedTimeLeft}
          timeSpent={timeSpent}
        />
      )}

      {/* Menu Flutuante de Anotações */}
      <FloatingAnnotationMenu
        isVisible={showFloatingMenu && !focusMode}
        position={floatingMenuPosition}
        theme={theme}
        currentUnderlineStyle={underlineStyle}
        currentUnderlineThickness={underlineThickness}
        currentUnderlineColor={underlineColor}
        onHighlight={async (color) => {
          if (activeEditor && selectedText && selectionRange) {
            // Aplicar highlight visual
            activeEditor.chain().focus().toggleHighlight({ color }).run()

            // Salvar no banco de dados
            try {
              const response = await fetch('/api/annotations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  materialId,
                  texto: selectedText,
                  startOffset: selectionRange.start,
                  endOffset: selectionRange.end,
                  cor: color,
                  tipo: 'highlight',
                }),
              })

              if (response.ok) {
                await fetchAnnotations()
              }
            } catch (err) {
              console.error('Erro ao salvar highlight:', err)
            }

            setShowFloatingMenu(false)
          }
        }}
        onUnderline={async (style, thickness, color) => {
          if (activeEditor && selectedText && selectionRange) {
            // Aplicar sublinhado visual
            activeEditor.chain().focus().toggleCustomUnderline({
              style,
              thickness,
              color,
            }).run()

            // Salvar no banco de dados
            try {
              const response = await fetch('/api/annotations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  materialId,
                  texto: selectedText,
                  startOffset: selectionRange.start,
                  endOffset: selectionRange.end,
                  cor: color,
                  tipo: 'underline',
                  metadata: { style, thickness },
                }),
              })

              if (response.ok) {
                await fetchAnnotations()
              }
            } catch (err) {
              console.error('Erro ao salvar sublinhado:', err)
            }

            setShowFloatingMenu(false)
          }
        }}
        onStrikethrough={async () => {
          if (activeEditor && selectedText && selectionRange) {
            // Aplicar riscado visual
            activeEditor.chain().focus().toggleStrike().run()

            // Salvar no banco de dados
            try {
              const response = await fetch('/api/annotations/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  materialId,
                  texto: selectedText,
                  startOffset: selectionRange.start,
                  endOffset: selectionRange.end,
                  cor: '#000000',
                  tipo: 'strikethrough',
                }),
              })

              if (response.ok) {
                await fetchAnnotations()
              }
            } catch (err) {
              console.error('Erro ao salvar riscado:', err)
            }

            setShowFloatingMenu(false)
          }
        }}
      />

    </div>
  )
}
