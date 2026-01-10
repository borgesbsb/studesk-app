'use client'

import { useOnline } from '@/hooks/useOnline'
import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const { isOnline, wasOffline } = useOnline()
  const [show, setShow] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    if (!isOnline) {
      setShow(true)
      setShowReconnected(false)
    } else if (wasOffline && isOnline) {
      // Estava offline e voltou online
      setShow(false)
      setShowReconnected(true)

      // Oculta o banner de reconexão após 3 segundos
      const timer = setTimeout(() => {
        setShowReconnected(false)
      }, 3000)

      return () => clearTimeout(timer)
    } else {
      setShow(false)
      setShowReconnected(false)
    }
  }, [isOnline, wasOffline])

  // Banner de offline
  if (show && !isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Você está offline - Funcionalidades limitadas</span>
        </div>
      </div>
    )
  }

  // Banner de reconexão
  if (showReconnected) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 text-center text-sm font-medium shadow-lg animate-in slide-in-from-top duration-300">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Conexão restabelecida!</span>
        </div>
      </div>
    )
  }

  return null
}
