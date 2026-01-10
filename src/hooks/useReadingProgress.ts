import { useState, useEffect, useCallback, useRef } from 'react'

interface UseReadingProgressProps {
  materialId: string
  textLength: number
}

interface ReadingStats {
  scrollPercentage: number
  estimatedTimeLeft: number // em minutos
  wordsRead: number
  totalWords: number
}

const WORDS_PER_MINUTE = 200 // Velocidade média de leitura
const STORAGE_KEY_PREFIX = 'reading-position-'

export function useReadingProgress({ materialId, textLength }: UseReadingProgressProps) {
  const [scrollPercentage, setScrollPercentage] = useState(0)
  const [startTime] = useState(Date.now())
  const [timeSpent, setTimeSpent] = useState(0) // em segundos
  const intervalRef = useRef<NodeJS.Timeout>()

  // Estimar total de palavras (aproximadamente 5 caracteres por palavra)
  const totalWords = Math.floor(textLength / 5)
  const wordsRead = Math.floor((scrollPercentage / 100) * totalWords)
  const wordsLeft = totalWords - wordsRead
  const estimatedTimeLeft = Math.ceil(wordsLeft / WORDS_PER_MINUTE)

  // Contador de tempo
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [startTime])

  // Monitorar scroll
  const handleScroll = useCallback(() => {
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight
    const scrollTop = window.scrollY

    const scrollableHeight = documentHeight - windowHeight
    const percentage = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0

    setScrollPercentage(Math.min(100, Math.max(0, percentage)))
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    handleScroll() // Calcular posição inicial

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // Salvar posição de leitura no localStorage
  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${materialId}`
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          scrollPercentage,
          lastRead: Date.now(),
          timeSpent,
        })
      )
    } catch (err) {
      console.error('Erro ao salvar posição de leitura:', err)
    }
  }, [scrollPercentage, materialId, timeSpent])

  // Restaurar posição de leitura
  const restorePosition = useCallback(async () => {
    try {
      // Primeiro tentar buscar do histórico de leitura (banco de dados)
      const response = await fetch(`/api/material/${materialId}/historico-leitura`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.historico && data.historico.length > 0) {
          const ultimoHistorico = data.historico[0]
          const paginaSalva = ultimoHistorico.paginaAtual

          console.log(`📖 Restaurando posição: página ${paginaSalva}`)

          // Rolar para o elemento da página salva
          setTimeout(() => {
            const pageElement = document.querySelector(`[data-page-num="${paginaSalva}"]`)
            if (pageElement) {
              pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
              console.log(`✅ Rolado para página ${paginaSalva}`)
              return true
            }
          }, 500) // Delay para garantir que o conteúdo está renderizado

          return true
        }
      }

      // Fallback: usar localStorage se não houver histórico no banco
      const storageKey = `${STORAGE_KEY_PREFIX}${materialId}`
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const { scrollPercentage: savedPercentage } = JSON.parse(stored)
        const documentHeight = document.documentElement.scrollHeight
        const windowHeight = window.innerHeight
        const scrollableHeight = documentHeight - windowHeight
        const targetScroll = (savedPercentage / 100) * scrollableHeight

        window.scrollTo({ top: targetScroll, behavior: 'smooth' })
        return true
      }
    } catch (err) {
      console.error('Erro ao restaurar posição:', err)
    }
    return false
  }, [materialId])

  const stats: ReadingStats = {
    scrollPercentage,
    estimatedTimeLeft,
    wordsRead,
    totalWords,
  }

  return {
    stats,
    timeSpent,
    restorePosition,
  }
}
