'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { getFileApiUrl } from '@/lib/utils'
import WebViewer from '@pdftron/webviewer'

interface WebViewerEmbeddedCleanProps {
  pdfUrl?: string
  paginaProgresso?: number
  onUpdateProgress?: (pagina: number) => Promise<void>
}

export default function WebViewerEmbeddedClean({
  pdfUrl,
  paginaProgresso = 1,
  onUpdateProgress
}: WebViewerEmbeddedCleanProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const webViewerInstanceRef = useRef<any>(null)
  const [currentPage, setCurrentPage] = useState(paginaProgresso)
  const [savingProgress, setSavingProgress] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState('normal')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  
  // Estados do cronômetro
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0) // em segundos
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const themes = [
    { 
      id: 'normal', 
      name: 'Normal', 
      icon: '📄',
      filter: 'none'
    },
    { 
      id: 'sepia', 
      name: 'Sépia', 
      icon: '🌅',
      filter: 'sepia(80%) brightness(1.1) contrast(1.1)'
    },
    { 
      id: 'dark', 
      name: 'Escuro', 
      icon: '🌙',
      filter: 'invert(1) hue-rotate(180deg) brightness(0.9) contrast(1.2)'
    },
    { 
      id: 'high-contrast', 
      name: 'Alto Contraste', 
      icon: '⚫',
      filter: 'contrast(2) brightness(1.2)'
    },
    { 
      id: 'low-light', 
      name: 'Luz Baixa', 
      icon: '🔅',
      filter: 'brightness(0.8) contrast(1.3) sepia(20%)'
    },
    { 
      id: 'blue-light', 
      name: 'Tema Azul', 
      icon: '🔷',
      filter: 'sepia(20%) hue-rotate(180deg) brightness(1.1)'
    }
  ]

  // Função para formatar tempo em MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Iniciar cronômetro quando componente monta
  useEffect(() => {
    if (!isTimerRunning) {
      console.log('⏱️ Iniciando cronômetro de sessão...')
      setSessionStartTime(new Date())
      setIsTimerRunning(true)
      setElapsedTime(0)
    }

    return () => {
      if (isTimerRunning) {
        console.log('⏱️ Parando cronômetro de sessão...')
        setIsTimerRunning(false)
        setSessionStartTime(null)
        setElapsedTime(0)
      }
    }
  }, [isTimerRunning])

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

  const changeTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId)
    if (!theme) return

    try {
      // Aplicar filtro CSS no container do WebViewer
      if (viewerRef.current) {
        viewerRef.current.style.filter = theme.filter
      }
      
      // Injetar CSS global para garantir funcionamento em fullscreen
      const existingStyle = document.getElementById('webviewer-embedded-theme-style')
      if (existingStyle) {
        existingStyle.remove()
      }
      
      if (theme.filter !== 'none') {
        const style = document.createElement('style')
        style.id = 'webviewer-embedded-theme-style'
        style.textContent = `
          /* Filtros para modo normal */
          [data-element="webViewerContainer"],
          .webviewer-container,
          #webviewer-1,
          .DocumentContainer,
          .PageContainer {
            filter: ${theme.filter} !important;
          }
          
          /* Filtros para modo fullscreen */
          body:-webkit-full-screen [data-element="webViewerContainer"],
          body:-moz-full-screen [data-element="webViewerContainer"],
          body:fullscreen [data-element="webViewerContainer"],
          body:-webkit-full-screen .DocumentContainer,
          body:-moz-full-screen .DocumentContainer,
          body:fullscreen .DocumentContainer,
          body:-webkit-full-screen .PageContainer,
          body:-moz-full-screen .PageContainer,
          body:fullscreen .PageContainer {
            filter: ${theme.filter} !important;
          }
          
          /* Fallback para elementos WebViewer em fullscreen */
          :-webkit-full-screen iframe,
          :-moz-full-screen iframe,
          :fullscreen iframe {
            filter: ${theme.filter} !important;
          }
        `
        document.head.appendChild(style)
        
        console.log(`🎨 [EMBEDDED] CSS global aplicado para tema: ${theme.name}`)
      }
      
      // Salvar preferência
      localStorage.setItem('pdf-filter-theme', themeId)
      setSelectedTheme(themeId)
      setShowThemeMenu(false)
      
      // Aplicar filtros em elementos internos do WebViewer após carregamento
      if (webViewerInstanceRef.current) {
        setTimeout(() => {
          applyThemeToWebViewerElements(theme.filter)
        }, 100)
      }
      
      console.log(`🎨 [EMBEDDED] Filtro aplicado: ${theme.name} (${theme.filter})`)
    } catch (error) {
      console.error('[EMBEDDED] Erro ao aplicar filtro:', error)
    }
  }

  // Função para aplicar filtros em elementos internos do WebViewer
  const applyThemeToWebViewerElements = (filter: string) => {
    try {
      if (!viewerRef.current) return
      
      // Buscar elementos específicos do WebViewer
      const selectors = [
        '[data-element="webViewerContainer"]',
        '.DocumentContainer',
        '.PageContainer',
        '.webviewer-container',
        'iframe[src*="webviewer"]'
      ]
      
      selectors.forEach(selector => {
        const elements = viewerRef.current!.querySelectorAll(selector)
        elements.forEach((element: any) => {
          if (element) {
            element.style.filter = filter
            console.log(`🎨 [EMBEDDED] Filtro aplicado em: ${selector}`)
          }
        })
      })
      
      // Aplicar também no iframe se existir
      const iframe = viewerRef.current.querySelector('iframe')
      if (iframe && iframe.contentDocument) {
        const iframeBody = iframe.contentDocument.body
        if (iframeBody) {
          iframeBody.style.filter = filter
          console.log('🎨 [EMBEDDED] Filtro aplicado no iframe')
        }
      }
    } catch (error) {
      console.error('[EMBEDDED] Erro ao aplicar filtros em elementos internos:', error)
    }
  }

  // Observer para detectar mudanças no DOM (como fullscreen)
  useEffect(() => {
    if (!viewerRef.current || !webViewerInstanceRef.current) return
    
    const observer = new MutationObserver(() => {
      const currentTheme = themes.find(t => t.id === selectedTheme)
      if (currentTheme && currentTheme.filter !== 'none') {
        // Reaplicar filtros após mudanças no DOM
        setTimeout(() => {
          applyThemeToWebViewerElements(currentTheme.filter)
        }, 100)
      }
    })
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['class', 'style']
    })
    
    // Detectar mudanças de fullscreen
    const handleFullscreenChange = () => {
      const currentTheme = themes.find(t => t.id === selectedTheme)
      if (currentTheme) {
        console.log('🔄 [EMBEDDED] Fullscreen mudou, reaplicando filtros...')
        setTimeout(() => {
          changeTheme(selectedTheme) // Reaplicar tema completo
        }, 200)
      }
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    
    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
    }
  }, [selectedTheme, webViewerInstanceRef.current])

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('pdf-filter-theme') || 'normal'
    setSelectedTheme(savedTheme)
  }, [])

  // Função para limpar cache e reinicializar WebViewer
  const handleWebViewerTrialExpired = useCallback(async () => {
    console.warn('🚨 WebViewer trial expirado detectado, limpando cache...')
    
    try {
      // Limpar todos os tipos de cache do browser
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
        console.log('✅ Cache de Service Workers limpo')
      }
      
      // Limpar localStorage e sessionStorage (mas preservar tema)
      const savedTheme = localStorage.getItem('pdf-filter-theme')
      localStorage.clear()
      sessionStorage.clear()
      if (savedTheme) {
        localStorage.setItem('pdf-filter-theme', savedTheme)
      }
      console.log('✅ Local/Session Storage limpo')
      
      // Limpar IndexedDB se disponível
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases()
          await Promise.all(databases.map(db => {
            if (db.name) {
              const deleteReq = indexedDB.deleteDatabase(db.name)
              return new Promise((resolve) => {
                deleteReq.onsuccess = () => resolve(true)
                deleteReq.onerror = () => resolve(false)
              })
            }
          }))
          console.log('✅ IndexedDB limpo')
        } catch (e) {
          console.log('⚠️ Não foi possível limpar IndexedDB:', e)
        }
      }
      
      toast.info('Cache limpo! Reinicializando PDF...', {
        duration: 2000
      })
      
      // Limpar instância do WebViewer atual
      if (webViewerInstanceRef.current) {
        webViewerInstanceRef.current = null
      }
      
      // Limpar o container
      if (viewerRef.current) {
        viewerRef.current.innerHTML = ''
      }
      
      // Aguardar um pouco e então reinicializar
      setTimeout(() => {
        console.log('🔄 Reinicializando WebViewer após limpeza de cache...')
        
        // Forçar re-render do componente para reinicializar o WebViewer
        const currentUrl = window.location.href
        window.location.href = currentUrl
        
      }, 1500)
      
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error)
      // Fallback: apenas recarregar a página
      toast.info('Recarregando página...', { duration: 2000 })
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }, [])

  // Aplicar tema salvo ao container quando estiver pronto
  useEffect(() => {
    if (viewerRef.current && selectedTheme) {
      const theme = themes.find(t => t.id === selectedTheme)
      if (theme) {
        viewerRef.current.style.filter = theme.filter
      }
    }
  }, [selectedTheme])

  // Listener global para erros não capturados do WebViewer
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.error?.message || ''
      if (errorMessage.includes('trial has expired') || 
          errorMessage.includes('7-day trial') ||
          errorMessage.includes('Thank you for evaluating WebViewer')) {
        console.warn('🚨 Trial do WebViewer expirado detectado (erro global)!')
        event.preventDefault()
        handleWebViewerTrialExpired()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || event.reason?.toString() || ''
      if (errorMessage.includes('trial has expired') || 
          errorMessage.includes('7-day trial') ||
          errorMessage.includes('Thank you for evaluating WebViewer')) {
        console.warn('🚨 Trial do WebViewer expirado detectado (promise rejeitada)!')
        event.preventDefault()
        handleWebViewerTrialExpired()
      }
    }

    window.addEventListener('error', handleGlobalError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleGlobalError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleWebViewerTrialExpired])

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-theme-menu]')) {
        setShowThemeMenu(false)
      }
    }

    if (showThemeMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showThemeMenu])

  const handleSaveProgress = async () => {
    if (!onUpdateProgress || savingProgress) return
    
    setSavingProgress(true)
    try {
      // Usar setTimeout para não bloquear a UI
      setTimeout(async () => {
        try {
          await onUpdateProgress(currentPage)
          
          // Salvar histórico de leitura se houver tempo de sessão
          if (sessionStartTime && elapsedTime > 0) {
            try {
              // Extrair materialId da URL se disponível
              const urlParams = new URLSearchParams(window.location.search)
              const materialId = urlParams.get('materialId') || 
                               window.location.pathname.split('/').pop()
              
              if (materialId) {
                const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    paginaAtual: currentPage,
                    tempoLeituraSegundos: elapsedTime,
                    assuntosEstudados: null
                  }),
                })

                if (response.ok) {
                  console.log('✅ Histórico de leitura salvo no componente embutido')
                }
              }
            } catch (error) {
              console.error('❌ Erro ao salvar histórico de leitura:', error)
            }
          }
          
          toast.success(`Progresso salvo na página ${currentPage} - Tempo: ${formatTime(elapsedTime)}`)
        } catch (error) {
          console.error('Erro ao salvar progresso:', error)
          toast.error('Erro ao salvar progresso')
        } finally {
          setSavingProgress(false)
        }
      }, 0)
    } catch (error) {
      setSavingProgress(false)
    }
  }

  const waitForElement = (selector: () => HTMLElement | null, maxAttempts = 50): Promise<HTMLElement> => {
    return new Promise((resolve, reject) => {
      let attempts = 0
      
      const check = () => {
        const element = selector()
        if (element) {
          resolve(element)
        } else if (attempts < maxAttempts) {
          attempts++
          setTimeout(check, 100)
        } else {
          reject(new Error('Element not found'))
        }
      }
      
      check()
    })
  }

  useEffect(() => {
    if (pdfUrl) {
      const initWebViewer = async () => {
        try {
          const element = await waitForElement(() => viewerRef.current)

          // Converter URL para formato da API se necessário
          const apiUrl = getFileApiUrl(pdfUrl)
          
          const instance = await WebViewer({
            path: '/lib/webviewer',
            licenseKey: process.env.NEXT_PUBLIC_PDFTRON_LICENSE_KEY,
            initialDoc: apiUrl,
            fullAPI: true,
            enableFilePicker: false,
            enableRedaction: false,
            enableMeasurement: false
          }, element)

          webViewerInstanceRef.current = instance

          const { documentViewer, Tools } = instance.Core

          // Configurar modo pan e ajuste de largura
          instance.UI.setToolMode(Tools.ToolNames.PAN)
          instance.UI.setFitMode(instance.UI.FitMode.FitWidth)

          // Desabilitar zoom com scroll
          instance.UI.disableFeatures([instance.UI.Feature.MouseWheelZoom])

          // Event listeners
          documentViewer.addEventListener('documentLoaded', () => {
            console.log('✅ [EMBEDDED] PDF carregado com sucesso')
            console.log(`📖 [EMBEDDED] Página de progresso a carregar: ${paginaProgresso}`)
            
            // Aplicar filtro salvo após carregamento
            const savedTheme = localStorage.getItem('pdf-filter-theme') || 'normal'
            if (savedTheme !== 'normal') {
              setTimeout(() => {
                changeTheme(savedTheme)
              }, 500)
            }

            // Configurar scroll com mouse wheel APÓS documento carregado
            setTimeout(() => {
              const scrollViewElement = documentViewer.getScrollViewElement()
              if (scrollViewElement) {
                console.log('🖱️ [EMBEDDED] Configurando scroll da rodinha do mouse...')
                
                // Função para handle do wheel event
                const handleWheel = (e: Event) => {
                  const wheelEvent = e as WheelEvent
                  wheelEvent.preventDefault()
                  wheelEvent.stopPropagation()
                  
                  if (scrollViewElement && wheelEvent.deltaY !== 0) {
                    // Scroll mais suave e responsivo
                    const scrollAmount = wheelEvent.deltaY * 2
                    scrollViewElement.scrollTop += scrollAmount
                    
                    console.log(`🔄 [EMBEDDED] Scroll: ${scrollAmount}px (deltaY: ${wheelEvent.deltaY})`)
                  }
                }
                
                // Remover event listeners anteriores se existirem
                scrollViewElement.removeEventListener('wheel', handleWheel)
                
                // Adicionar novo event listener
                scrollViewElement.addEventListener('wheel', handleWheel, { passive: false })
                
                console.log('✅ [EMBEDDED] Scroll da rodinha configurado com sucesso!')
              } else {
                console.warn('⚠️ [EMBEDDED] ScrollViewElement não encontrado')
              }
            }, 100)

            // Navegar para a página de progresso salva DENTRO do documentLoaded
            if (paginaProgresso && paginaProgresso > 1) {
              console.log(`🎯 [EMBEDDED] Navegando para página de progresso salva: ${paginaProgresso}`)
              
              setTimeout(() => {
                try {
                  const totalPages = documentViewer.getPageCount()
                  console.log(`📊 [EMBEDDED] Total de páginas: ${totalPages}`)
                  
                  if (paginaProgresso <= totalPages) {
                    documentViewer.setCurrentPage(paginaProgresso, true)
                    console.log(`✅ [EMBEDDED] Navegação concluída para página ${paginaProgresso}`)
                  } else {
                    console.warn(`⚠️ [EMBEDDED] Página ${paginaProgresso} excede total de páginas (${totalPages})`)
                    documentViewer.setCurrentPage(1, true)
                  }
                } catch (error) {
                  console.error('❌ [EMBEDDED] Erro ao navegar para página de progresso:', error)
                  // Fallback para primeira página
                  documentViewer.setCurrentPage(1, true)
                }
              }, 800) // Delay otimizado para carregamento completo
            } else {
              console.log('📄 [EMBEDDED] Iniciando na primeira página (sem progresso salvo)')
            }
          })

          // Event listener para página atual
          documentViewer.addEventListener('pageNumberUpdated', (pageNumber) => {
            setCurrentPage(pageNumber)
            console.log(`📄 [EMBEDDED] Página atual: ${pageNumber}`)
          })

          documentViewer.addEventListener('error', (err) => {
            console.error('❌ [EMBEDDED] Erro no WebViewer:', err)
            
            // Verificar se é erro de trial expirado
            const errorMessage = err?.message || err?.toString() || ''
            if (errorMessage.includes('trial has expired') || 
                errorMessage.includes('7-day trial') ||
                errorMessage.includes('Thank you for evaluating WebViewer')) {
              console.warn('🚨 Trial do WebViewer expirado detectado!')
              handleWebViewerTrialExpired()
            }
          })

        } catch (error) {
          console.error('❌ [EMBEDDED] Erro ao inicializar WebViewer:', error)
          
          // Verificar se é erro de trial expirado na inicialização
          const errorMessage = (error as any)?.message || error?.toString() || ''
          if (errorMessage.includes('trial has expired') || 
              errorMessage.includes('7-day trial') ||
              errorMessage.includes('Thank you for evaluating WebViewer')) {
            console.warn('🚨 Trial do WebViewer expirado detectado na inicialização!')
            handleWebViewerTrialExpired()
          }
        }
      }

      initWebViewer()
    }

    return () => {
      if (webViewerInstanceRef.current) {
        webViewerInstanceRef.current = null
      }
    }
  }, [pdfUrl])

  if (!pdfUrl) return null

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header com controles do PDF Viewer */}
      <div 
        className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-white flex-shrink-0 transition-all duration-300"
        style={{ 
          filter: themes.find(t => t.id === selectedTheme)?.filter || 'none'
        }}
      >
        <div className="flex items-center gap-4">
                    {/* Informação da página atual e cronômetro */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700 font-medium">
                Página {currentPage}
              </span>
            </div>
            
            {/* Cronômetro */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-700 font-medium font-mono">
                ⏱️ {formatTime(elapsedTime)}
              </span>
            </div>
          </div>
          
          {/* Seletor de Temas Visuais */}
          <div className="relative" data-theme-menu>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="text-xs h-8 px-3 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 shadow-sm"
            >
              {themes.find(t => t.id === selectedTheme)?.icon} Tema
            </Button>
            
            {showThemeMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-40 min-w-[140px]">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => changeTheme(theme.id)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 flex items-center gap-2 ${
                      selectedTheme === theme.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <span className="text-sm">{theme.icon}</span>
                    {theme.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
          
        {/* Lado direito - controles */}
        <div className="flex items-center gap-4">
          {onUpdateProgress && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveProgress}
              disabled={savingProgress}
              className="text-xs h-8 px-3 bg-green-50 hover:bg-green-100 border-green-200 text-green-700 shadow-sm"
            >
              {savingProgress ? (
                <>
                  <div className="w-3 h-3 border border-green-300 border-t-green-600 rounded-full animate-spin mr-1" />
                  Salvando...
                </>
              ) : (
                '💾 Marcar Progresso'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* WebViewer Container com temas CSS */}
      <div 
        ref={viewerRef} 
        className="flex-1 min-h-0 transition-all duration-300"
        style={{ 
          filter: themes.find(t => t.id === selectedTheme)?.filter || 'none'
        }}
      />
    </div>
  )
} 