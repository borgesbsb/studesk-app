import { useState, useEffect } from 'react'
import type { ReaderPreferences } from '@/components/reader/types'

const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'light',
  fontFamily: 'sans-serif',
  fontSize: 18,
  columnWidth: 'medium',
  lineHeight: 'relaxed',
  textAlign: 'justify',
}

const STORAGE_KEY = 'reader-preferences'

export function useReaderPreferences() {
  const [preferences, setPreferences] = useState<ReaderPreferences>(DEFAULT_PREFERENCES)
  const [isLoaded, setIsLoaded] = useState(false)

  // Carregar preferências do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed })
      }
    } catch (err) {
      console.error('Erro ao carregar preferências:', err)
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Salvar preferências no localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
      } catch (err) {
        console.error('Erro ao salvar preferências:', err)
      }
    }
  }, [preferences, isLoaded])

  const updatePreference = <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }))
  }

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES)
  }

  return {
    preferences,
    updatePreference,
    resetPreferences,
    isLoaded,
  }
}
