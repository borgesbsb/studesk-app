'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OfflinePage() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(false)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setTimeout(() => {
        router.push('/dashboard')
      }, 1000)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [router])

  const handleRetry = () => {
    setRetrying(true)

    // Simula tentativa de reconexão
    setTimeout(() => {
      if (navigator.onLine) {
        router.push('/dashboard')
      } else {
        setRetrying(false)
      }
    }, 1500)
  }

  if (isOnline) {
    return (
      <div className="h-screen overflow-hidden flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/20 backdrop-blur-lg">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              Conectado!
            </h1>
            <p className="text-base sm:text-lg text-gray-300">
              Redirecionando...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-lg">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Você está offline
          </h1>
          <p className="text-base sm:text-lg text-gray-300">
            Não foi possível conectar à internet. Verifique sua conexão e tente novamente.
          </p>
        </div>

        {/* Status */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4">
          <p className="text-sm text-gray-300">
            O app continua funcionando offline com dados em cache. Algumas funcionalidades podem estar limitadas.
          </p>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="w-full py-4 px-6 bg-white hover:bg-gray-100 text-slate-900 font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
        >
          {retrying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Tentando reconectar...
            </span>
          ) : (
            'Tentar novamente'
          )}
        </button>

        {/* Tips */}
        <div className="text-left bg-white/5 backdrop-blur-lg rounded-2xl p-4 space-y-2">
          <p className="text-sm font-semibold text-white">Dicas:</p>
          <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
            <li>Verifique se o Wi-Fi ou dados móveis estão ativos</li>
            <li>Tente trocar de rede</li>
            <li>Algumas funcionalidades funcionam offline</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
