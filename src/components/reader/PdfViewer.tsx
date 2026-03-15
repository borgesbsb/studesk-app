'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { registerLicense } from '@syncfusion/ej2-base'
import { PdfViewerComponent, Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner, Inject, Annotation, ToolbarSettingsModel, CustomToolbarItemModel } from '@syncfusion/ej2-react-pdfviewer'
import { toast } from 'sonner'
import { PdfThemeSelector, PdfThemeConfig } from './PdfThemeSelector'

// Import Syncfusion styles
import '@syncfusion/ej2-base/styles/material.css'
import '@syncfusion/ej2-buttons/styles/material.css'
import '@syncfusion/ej2-popups/styles/material.css'
import '@syncfusion/ej2-navigations/styles/material.css'
import '@syncfusion/ej2-inputs/styles/material.css'
import '@syncfusion/ej2-dropdowns/styles/material.css'
import '@syncfusion/ej2-lists/styles/material.css'
import '@syncfusion/ej2-notifications/styles/material.css'
import '@syncfusion/ej2-splitbuttons/styles/material.css'
import '@syncfusion/ej2-react-pdfviewer/styles/material.css'

interface PdfViewerProps {
  pdfUrl: string
  materialId: string
}

export function PdfViewer({ pdfUrl, materialId }: PdfViewerProps) {
  const [resourceUrl, setResourceUrl] = useState('')
  const [absolutePdfUrl, setAbsolutePdfUrl] = useState('')
  const [mounted, setMounted] = useState(false)
  const [isProcessingBlob, setIsProcessingBlob] = useState(false)
  const viewerRef = useRef<PdfViewerComponent>(null)

  const [elapsedTime, setElapsedTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [paginaSalva, setPaginaSalva] = useState<number | null>(null)
  const [currentTheme, setCurrentTheme] = useState<{ filter: string } | null>(null)
  const [themeSelectorMounted, setThemeSelectorMounted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Registrar licença do Syncfusion
  useEffect(() => {
    const licenseKey = process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY
    if (licenseKey && typeof window !== 'undefined') {
      registerLicense(licenseKey)
    }
  }, [])

  // Buscar última página lida ao montar o componente
  useEffect(() => {
    const buscarUltimaPaginaLida = async () => {
      try {
        const response = await fetch(`/api/material/${materialId}/historico-leitura`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.historico && data.historico.length > 0) {
            // Pega o histórico mais recente (primeiro item, pois vem ordenado por data desc)
            const ultimoHistorico = data.historico[0]
            setPaginaSalva(ultimoHistorico.paginaAtual)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar última página lida:', error)
      }
    }

    if (materialId) {
      buscarUltimaPaginaLida()
    }
  }, [materialId])

  useEffect(() => {
    setMounted(true)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    setResourceUrl(`${baseUrl}/ej2-pdfviewer-lib`)

    // Convert Blob URLs to Base64
    const processPdfUrl = async () => {
      if (!pdfUrl) {
        setAbsolutePdfUrl('')
        return
      }

      if (pdfUrl.startsWith('blob:')) {
        setIsProcessingBlob(true)
        try {
          const response = await fetch(pdfUrl)
          const blob = await response.blob()
          const reader = new FileReader()

          reader.onloadend = () => {
            const base64data = reader.result as string
            setAbsolutePdfUrl(base64data)
            setIsProcessingBlob(false)
          }

          reader.onerror = (error) => {
            console.error('Erro ao converter Blob para Base64:', error)
            setAbsolutePdfUrl(pdfUrl)
            setIsProcessingBlob(false)
          }

          reader.readAsDataURL(blob)
        } catch (error) {
          console.error('Erro ao processar Blob URL:', error)
          setAbsolutePdfUrl(pdfUrl)
          setIsProcessingBlob(false)
        }
      } else if (!pdfUrl.startsWith('http') && !pdfUrl.startsWith('data:')) {
        setAbsolutePdfUrl(`${window.location.origin}${pdfUrl.startsWith('/') ? '' : '/'}${pdfUrl}`)
      } else {
        setAbsolutePdfUrl(pdfUrl)
      }
    }

    processPdfUrl()
  }, [pdfUrl])

  // Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    } else if (interval) {
      clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning])

  // Iniciar cronômetro automaticamente
  useEffect(() => {
    setIsRunning(true)
  }, [])

  // Atualizar display do cronômetro na toolbar
  useEffect(() => {
    if (mounted) {
      const timerElement = document.getElementById('timer_display')
      if (timerElement) {
        const h = Math.floor(elapsedTime / 3600)
        const m = Math.floor((elapsedTime % 3600) / 60)
        const s = elapsedTime % 60
        timerElement.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      }
    }
  }, [elapsedTime, mounted])

  const handleToggleTimer = () => {
    setIsRunning(!isRunning)
    const playBtn = document.getElementById('timer_play')
    const pauseBtn = document.getElementById('timer_pause')
    if (playBtn && pauseBtn) {
      if (isRunning) {
        playBtn.style.display = 'inline-block'
        pauseBtn.style.display = 'none'
      } else {
        playBtn.style.display = 'none'
        pauseBtn.style.display = 'inline-block'
      }
    }
  }

  const handleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true)
        toast.success('Modo tela cheia ativado')
      }).catch((err) => {
        console.error('Erro ao entrar em fullscreen:', err)
        toast.error('Não foi possível entrar em tela cheia')
      })
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false)
        toast.success('Modo tela cheia desativado')
      })
    }
  }

  // Detectar mudanças de fullscreen (ex: ESC pressionado)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement
      setIsFullscreen(isNowFullscreen)

      // Atualizar texto do botão
      const fullscreenText = document.getElementById('fullscreen_text')
      if (fullscreenText) {
        fullscreenText.textContent = isNowFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Atualizar ícone do botão de fullscreen
  useEffect(() => {
    if (mounted) {
      const fullscreenBtn = document.querySelector('#fullscreen_toggle .e-tbar-btn-text') as HTMLElement
      const fullscreenIcon = document.querySelector('#fullscreen_toggle .e-icons') as HTMLElement

      if (fullscreenBtn) {
        fullscreenBtn.textContent = isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'
      }

      if (fullscreenIcon) {
        fullscreenIcon.className = isFullscreen ? 'e-icons e-minimize' : 'e-icons e-maximize'
      }
    }
  }, [isFullscreen, mounted])

  const handleMarkProgress = async () => {
    setIsSaving(true)
    console.log('\n🔵 ===== MARCAR PROGRESSO - INÍCIO =====')
    console.log('📄 Material ID:', materialId)
    console.log('⏱️  Tempo decorrido (segundos):', elapsedTime)
    console.log('⏱️  Tempo decorrido (horas):', (elapsedTime / 3600).toFixed(4))

    try {
      // Obter página atual do viewer
      const paginaAtual = viewerRef.current?.currentPageNumber || 1
      console.log('📖 Página atual:', paginaAtual)

      const payload = {
        paginaAtual,
        tempoLeituraSegundos: elapsedTime,
      }
      console.log('📤 Enviando payload:', payload)

      const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('📥 Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Response data:', data)

        console.log('\n🎯 VERIFICANDO ATUALIZAÇÃO DO PLANO:')
        console.log('   planoAtualizado:', data.planoAtualizado)
        console.log('   horasAdicionadas:', data.horasAdicionadas)
        console.log('   disciplinasAtualizadas:', data.disciplinasAtualizadas)

        toast.success(data.message || 'Progresso salvo com sucesso!')
        setElapsedTime(0)

        console.log('🔵 ===== MARCAR PROGRESSO - FIM =====\n')
        console.log('ℹ️  A página /hoje será atualizada automaticamente quando você voltar para ela')
      } else {
        const errorData = await response.json()
        console.error('❌ Erro na response:', errorData)
        toast.error(errorData.error || 'Erro ao salvar progresso')
      }
    } catch (error) {
      console.error('❌ Erro ao marcar progresso:', error)
      toast.error('Erro ao salvar progresso')
    } finally {
      setIsSaving(false)
    }
  }

  const toolbarSettings: ToolbarSettingsModel = {
    showTooltip: true,
    toolbarItems: [
      {
        prefixIcon: 'e-icons e-arrow-left',
        id: 'back_button',
        text: 'Voltar',
        tooltipText: 'Voltar para lista de materiais',
        align: 'Left'
      } as CustomToolbarItemModel,
      'OpenOption',
      'PageNavigationTool',
      'MagnificationTool',
      'PanTool',
      'SelectionTool',
      'SearchOption',
      {
        prefixIcon: 'e-icons e-clock',
        id: 'timer_toggle',
        tooltipText: 'Pausar/Continuar Cronômetro',
        align: 'Right',
        template: `
          <div style="display: flex; align-items: center; gap: 8px; padding: 0 12px;">
            <span class="e-icons e-clock" style="font-size: 18px;"></span>
            <span id="timer_display" style="font-family: monospace; font-size: 14px; font-weight: 500; min-width: 65px;">00:00:00</span>
            <button id="timer_play" style="display: none; background: none; border: none; cursor: pointer; padding: 4px;">
              <span class="e-icons e-play" style="font-size: 14px;"></span>
            </button>
            <button id="timer_pause" style="background: none; border: none; cursor: pointer; padding: 4px;">
              <span class="e-icons e-pause" style="font-size: 14px;"></span>
            </button>
          </div>
        `
      } as CustomToolbarItemModel,
      {
        id: 'mark_progress',
        tooltipText: 'Salvar Progresso de Leitura',
        align: 'Right',
        template: `
          <button id="mark_progress_btn" style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: rgba(0,0,0,0.87);
            border-radius: 4px;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(0,0,0,0.04)'" onmouseout="this.style.backgroundColor='transparent'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Salvar Progresso</span>
          </button>
        `
      } as CustomToolbarItemModel,
      {
        id: 'fullscreen_toggle',
        tooltipText: 'Ativar/Desativar Tela Cheia',
        align: 'Right',
        template: `
          <button id="fullscreen_btn" style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 14px;
            color: rgba(0,0,0,0.87);
            border-radius: 4px;
            transition: background-color 0.2s;
          " onmouseover="this.style.backgroundColor='rgba(0,0,0,0.04)'" onmouseout="this.style.backgroundColor='transparent'">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
            <span id="fullscreen_text">Tela Cheia</span>
          </button>
        `
      } as CustomToolbarItemModel,
      {
        id: 'theme_selector',
        template: '<div id="theme_selector_container" style="min-width: 120px; padding: 4px;"></div>',
        align: 'Right'
      } as CustomToolbarItemModel,
      'PrintOption',
      'DownloadOption',
    ]
  }

  const toolbarClick = (args: any) => {
    if (args.item) {
      if (args.item.id === 'back_button') {
        window.history.back()
      } else if (args.item.id === 'timer_toggle') {
        handleToggleTimer()
      } else if (args.item.id === 'fullscreen_toggle') {
        handleFullscreen()
      } else if (args.item.id === 'mark_progress') {
        handleMarkProgress()
      }
    }
  }

  const handleDocumentLoad = () => {
    // Restaurar a página salva quando o documento for carregado
    if (paginaSalva && viewerRef.current) {
      setTimeout(() => {
        if (viewerRef.current) {
          viewerRef.current.navigation.goToPage(paginaSalva)
          console.log(`📖 Restaurada posição: página ${paginaSalva}`)
        }
      }, 500) // Pequeno delay para garantir que o PDF está totalmente carregado
    }
  }

  // Adicionar event listeners e theme selector após o toolbar ser renderizado
  useEffect(() => {
    if (mounted) {
      const playBtn = document.getElementById('timer_play')
      const pauseBtn = document.getElementById('timer_pause')

      if (playBtn && pauseBtn) {
        playBtn.onclick = handleToggleTimer
        pauseBtn.onclick = handleToggleTimer
      }

      // Nota: fullscreen_btn NÃO precisa de onclick aqui porque o toolbarClick já trata isso
      // Adicionar onclick causaria chamada duplicada e erro de "user gesture"

      // Tentar encontrar e renderizar o theme selector
      const checkAndRenderThemeSelector = () => {
        const container = document.getElementById('theme_selector_container')
        console.log('🎨 Verificando theme selector container:', container)
        if (container && !themeSelectorMounted) {
          console.log('✅ Container encontrado, montando theme selector')
          setThemeSelectorMounted(true)
        }
      }

      // Verificar imediatamente e também após delays
      checkAndRenderThemeSelector()
      const timer = setTimeout(checkAndRenderThemeSelector, 500)
      const timer2 = setTimeout(checkAndRenderThemeSelector, 1000)
      const timer3 = setTimeout(checkAndRenderThemeSelector, 2000)

      return () => {
        clearTimeout(timer)
        clearTimeout(timer2)
        clearTimeout(timer3)
      }
    }
  }, [mounted, themeSelectorMounted])

  const handleThemeChange = useCallback((filterString: string) => {
    setCurrentTheme({ filter: filterString } as any)
  }, [])

  if (!resourceUrl) return null

  if (isProcessingBlob) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Processando PDF do cache...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        backgroundColor: isFullscreen ? '#000' : 'transparent'
      }}
    >
      <div
        id="pdf_viewer_wrapper"
        style={{
          height: '100%',
          width: '100%',
          filter: currentTheme?.filter || 'none',
          transition: 'filter 0.3s ease'
        }}
      >
        {mounted && resourceUrl && (
          <PdfViewerComponent
            id="container"
            ref={viewerRef}
            documentPath={absolutePdfUrl || undefined}
            resourceUrl={resourceUrl}
            style={{ height: '100%', width: '100%' }}
            toolbarSettings={toolbarSettings}
            toolbarClick={toolbarClick}
            documentLoad={handleDocumentLoad}
            enableAnnotation={true}
            enableTextSelection={true}
            enablePinchZoom={true}
            enableHyperlink={true}
            enableDownload={true}
            enablePrint={true}
            enableNavigationToolbar={true}
          >
            <Inject services={[Toolbar, Magnification, Navigation, LinkAnnotation, BookmarkView, ThumbnailView, Print, TextSelection, TextSearch, FormFields, FormDesigner, Annotation]} />
          </PdfViewerComponent>
        )}
        {(!mounted || !resourceUrl) && (
          <div className="h-full w-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Carregando visualizador...</p>
            </div>
          </div>
        )}
      </div>

      {/* Renderizar PdfThemeSelector via portal */}
      {mounted && themeSelectorMounted && typeof window !== 'undefined' && (() => {
        const container = document.getElementById('theme_selector_container')
        return container ? createPortal(
          <PdfThemeSelector onThemeChange={handleThemeChange} />,
          container
        ) : null
      })()}
    </div>
  )
}
