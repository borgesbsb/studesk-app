'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWABanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verificar se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Verificar se o banner foi dispensado antes
    const bannerDismissed = localStorage.getItem('pwa-install-dismissed')
    if (bannerDismissed) {
      const dismissedDate = new Date(bannerDismissed)
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)

      // Mostrar novamente após 7 dias
      if (daysSinceDismissed < 7) {
        return
      }
    }

    // Capturar o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
      console.log('📱 Evento beforeinstallprompt capturado - PWA pode ser instalado')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Detectar quando o app foi instalado
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA instalado com sucesso!')
      setShowBanner(false)
      setIsInstalled(true)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-install-dismissed')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.log('❌ Prompt de instalação não disponível')
      return
    }

    // Mostrar o prompt de instalação
    deferredPrompt.prompt()

    // Aguardar a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice
    console.log(`👤 Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`)

    if (outcome === 'accepted') {
      setShowBanner(false)
    }

    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString())
    console.log('🚫 Banner de instalação dispensado pelo usuário')
  }

  // Não mostrar se já está instalado ou se não deve mostrar
  if (isInstalled || !showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-black/95 via-black/90 to-transparent animate-slide-up">
      <div className="max-w-md mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-lg rounded-xl flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-base mb-1">
              Instalar Studesk
            </h3>
            <p className="text-white/90 text-sm leading-snug mb-3">
              Acesse offline, receba notificações e tenha uma experiência completa
            </p>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-white text-blue-600 font-semibold text-sm py-2.5 px-4 rounded-xl hover:bg-white/95 active:scale-95 transition-all shadow-lg"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2.5 text-white/90 text-sm font-medium hover:text-white active:scale-95 transition-all"
              >
                Agora não
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/70 hover:text-white active:scale-90 transition-all"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
