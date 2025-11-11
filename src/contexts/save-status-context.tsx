'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface SaveStatusContextType {
  status: SaveStatus
  message: string
  setSaving: () => void
  setSuccess: (message?: string) => void
  setError: (message?: string) => void
  clearStatus: () => void
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(undefined)

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [message, setMessage] = useState('')

  const setSaving = useCallback(() => {
    setStatus('saving')
    setMessage('Salvando...')
  }, [])

  const setSuccess = useCallback((customMessage?: string) => {
    setStatus('success')
    setMessage(customMessage || 'Salvo! ✅')
    
    // Auto-hide após 2 segundos
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 2000)
  }, [])

  const setError = useCallback((customMessage?: string) => {
    setStatus('error')
    setMessage(customMessage || 'Problemas ao atualizar ❌')
    
    // Auto-hide após 3 segundos
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
    }, 3000)
  }, [])

  const clearStatus = useCallback(() => {
    setStatus('idle')
    setMessage('')
  }, [])

  return (
    <SaveStatusContext.Provider value={{
      status,
      message,
      setSaving,
      setSuccess,
      setError,
      clearStatus
    }}>
      {children}
    </SaveStatusContext.Provider>
  )
}

export function useSaveStatus() {
  const context = useContext(SaveStatusContext)
  if (context === undefined) {
    throw new Error('useSaveStatus must be used within a SaveStatusProvider')
  }
  return context
}