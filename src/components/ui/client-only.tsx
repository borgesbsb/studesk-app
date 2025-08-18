'use client'

import { useEffect, useState } from 'react'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientOnly({ children, fallback }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    // Verificar se estamos no cliente
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setHasMounted(true)
    }
  }, [])

  // Nunca renderizar no servidor
  if (typeof window === 'undefined') {
    return fallback ? <>{fallback}</> : null
  }

  // Se não montou ainda no cliente, mostrar fallback
  if (!hasMounted) {
    return fallback ? <>{fallback}</> : (
      <div className="h-48 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center">
        <div className="text-gray-400">⏳ Carregando...</div>
      </div>
    )
  }

  return <>{children}</>
} 