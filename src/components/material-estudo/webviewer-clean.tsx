'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { getFileApiUrl } from '@/lib/utils'

interface WebViewerCleanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pdfUrl?: string
  paginaProgresso?: number
  onAtualizarProgresso?: (pagina: number) => Promise<void>
  materialId?: string
  onMiniSessaoCriada?: () => void
  onMaterialAtualizado?: (material: { id: string; paginasLidas: number; totalPaginas: number }) => void
}

export default function WebViewerCleanModal({
  open,
  onOpenChange,
  pdfUrl,
  paginaProgresso = 1,
  onAtualizarProgresso,
  materialId,
  onMiniSessaoCriada,
  onMaterialAtualizado
}: WebViewerCleanModalProps) {
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
  const [isNavigatingToProgress, setIsNavigatingToProgress] = useState(false)
  const [assuntoInput, setAssuntoInput] = useState('')
  const [adicionandoAssunto, setAdicionandoAssunto] = useState(false)
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false)
  const [pdfTimestamp, setPdfTimestamp] = useState(Date.now()) // Para forçar recarregamento manual
  const [annotationsSaved, setAnnotationsSaved] = useState(false) // Indicador de anotações salvas
  const [lastSavedElapsedSeconds, setLastSavedElapsedSeconds] = useState(0)

  // Função para forçar recarregamento do PDF
  const forcePdfReload = () => {
    console.log('🔄 Forçando recarregamento do PDF...')
    setPdfTimestamp(Date.now())
    setAnnotationsLoaded(false)
    setIsNavigatingToProgress(false)
    
    // Limpar instância anterior do WebViewer
    if (webViewerInstanceRef.current) {
      webViewerInstanceRef.current = null
    }
  }

  // Função para gerar URL do PDF com timestamp para evitar cache
  const getPdfUrlWithTimestamp = () => {
    if (!pdfUrl) return ''
    
    // Converter URL para formato da API se necessário
    const apiUrl = getFileApiUrl(pdfUrl)
    
    const separator = apiUrl.includes('?') ? '&' : '?'
    return `${apiUrl}${separator}t=${pdfTimestamp}`
  }

  // Função para salvar documento com anotações (baseada no exemplo)
  const saveDocumentWithAnnotations = async (filename: string) => {
    if (!webViewerInstanceRef.current || !materialId) {
      console.error('❌ WebViewer não inicializado ou materialId não encontrado')
      return Promise.reject('Viewer não disponível')
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        const { documentViewer, annotationManager } = webViewerInstanceRef.current.Core
        
        console.log('🔄 Exportando anotações...')
        const xfdfString = await annotationManager.exportAnnotations()
        console.log('📄 XFDF exportado:', xfdfString)
        
        if (!xfdfString || xfdfString.trim() === '<xfdf/>') {
          console.log('📋 Nenhuma anotação encontrada')
          toast.info('Nenhuma anotação encontrada para salvar')
          resolve()
          return
        }
        
        // Salvar anotações no banco de dados também
        try {
          const annotations = annotationManager.getAnnotationsList()
          if (annotations.length > 0) {
            const annotationsData = annotations.map((ann: any) => ({
              pagina: ann.PageNumber,
              texto: ann.Contents || '',
              posicaoX: ann.X || 0,
              posicaoY: ann.Y || 0,
              largura: ann.Width || 100,
              altura: ann.Height || 20,
              cor: ann.Color?.toString() || '#ffff00',
              tipo: ann.Subject || 'highlight'
            }))
            
            const dbResponse = await fetch(`/api/material/${materialId}/anotacoes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(annotationsData)
            })
            
            if (dbResponse.ok) {
              console.log('✅ Anotações salvas no banco de dados')
            }
          }
        } catch (dbError) {
          console.error('❌ Erro ao salvar anotações no banco:', dbError)
          // Não falhar o processo se o banco falhar
        }
        
        console.log('🔄 Obtendo dados do documento com anotações...')
        const data = await documentViewer.getDocument().getFileData({ xfdfString })
        console.log('✅ Dados do PDF obtidos com anotações incorporadas')
        
        const arr = new Uint8Array(data)
        const blob = new Blob([arr], { type: 'application/pdf' })
        
        // Criar FormData para enviar o blob
        const formData = new FormData()
        formData.append('pdf', blob, filename)
        formData.append('materialId', materialId)
        
        console.log('🚀 Enviando PDF para servidor...')
        const res = await fetch(`/api/material/${materialId}/save-annotations`, {
          method: 'POST',
          body: formData
        })
        
        if (res.status === 200) {
          console.log('✅ PDF salvo com sucesso!')
          
          // Mostrar toast com ícone de sucesso
          toast.success('Anotações salvas!', {
            description: 'PDF atualizado com suas anotações',
            icon: '💾',
            duration: 3000
          })
          
          // Ativar indicador de anotações salvas
          setAnnotationsSaved(true)
          
          // Removido: setPdfTimestamp(Date.now()) - não forçar recarregamento automático
          
          resolve()
        } else {
          console.error('❌ Erro ao salvar PDF:', res.status)
          reject('Erro ao salvar no servidor')
        }
      } catch (error: any) {
        console.error('❌ Erro no salvamento:', error)
        reject(error)
      }
    })
  }

  // Função para adicionar botão customizado no header (baseada no exemplo)
  const addSaveButtonToHeader = () => {
    if (!webViewerInstanceRef.current) return

    try {
      const instance = webViewerInstanceRef.current
      
      // Adicionar botão customizado no header
      const topHeader = instance.UI.getModularHeader('default-top-header')
      const items = topHeader.getItems()

      const saveButton = {
        type: 'customButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>',
        title: 'Salvar Anotações no PDF',
        onClick: function() {
          console.log('💾 Botão de salvar clicado')
          const filename = `material-${materialId}.pdf`
          saveDocumentWithAnnotations(filename).then(() => {
            console.log('✅ Salvamento concluído')
          }).catch((error) => {
            console.error('❌ Erro no salvamento:', error)
            toast.error('Erro ao salvar anotações')
          })
        }
      }

      const reloadButton = {
        type: 'customButton',
        img: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
        title: 'Recarregar PDF',
        onClick: function() {
          console.log('🔄 Botão de recarregar clicado')
          forcePdfReload()
          toast.info('Recarregando PDF...')
        }
      }

      // Verificar se os botões já existem antes de adicionar
      const existingSaveButton = items.find((item: any) => item.title === 'Salvar Anotações no PDF')
      const existingReloadButton = items.find((item: any) => item.title === 'Recarregar PDF')
      
      if (!existingSaveButton) {
        items.push(saveButton)
        console.log('✅ Botão de salvar adicionado ao header')
      }
      
      if (!existingReloadButton) {
        items.push(reloadButton)
        console.log('✅ Botão de recarregar adicionado ao header')
      }
      
      topHeader.setItems(items)
    } catch (error) {
      console.error('❌ Erro ao adicionar botões no header:', error)
    }
  }

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

  // Iniciar cronômetro quando modal abre
  useEffect(() => {
    if (open && !isTimerRunning) {
      console.log('⏱️ Iniciando cronômetro de sessão...')
      setSessionStartTime(new Date())
      setIsTimerRunning(true)
      setElapsedTime(0)
    } else if (!open && isTimerRunning) {
      console.log('⏱️ Parando cronômetro de sessão...')
      setIsTimerRunning(false)
      setSessionStartTime(null)
      setElapsedTime(0)
    }
  }, [open, isTimerRunning])

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

  // Função para salvar histórico de leitura
  const saveReadingHistory = async (pagina: number, tempoSegundos: number) => {
    if (!materialId) return

    try {
      const response = await fetch(`/api/material/${materialId}/historico-leitura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginaAtual: pagina,
          tempoLeituraSegundos: tempoSegundos,
          assuntosEstudados: null // Será preenchido na página do material
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar histórico de leitura')
      }

      const result = await response.json()
      console.log('✅ Histórico de leitura salvo:', result)
      return result
    } catch (error) {
      console.error('❌ Erro ao salvar histórico de leitura:', error)
      throw error
    }
  }

  const changeTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId)
    if (!theme) return

    try {
      // Aplicar filtro CSS no container do WebViewer
      if (viewerRef.current) {
        viewerRef.current.style.filter = theme.filter
      }
      
      // Injetar CSS global para garantir funcionamento em fullscreen
      const existingStyle = document.getElementById('webviewer-theme-style')
      if (existingStyle) {
        existingStyle.remove()
      }
      
      if (theme.filter !== 'none') {
        const style = document.createElement('style')
        style.id = 'webviewer-theme-style'
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
        
        console.log(`🎨 CSS global aplicado para tema: ${theme.name}`)
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
      
      console.log(`🎨 Filtro aplicado: ${theme.name} (${theme.filter})`)
    } catch (error) {
      console.error('Erro ao aplicar filtro:', error)
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
            console.log(`🎨 Filtro aplicado em: ${selector}`)
          }
        })
      })
      
      // Aplicar também no iframe se existir
      const iframe = viewerRef.current.querySelector('iframe')
      if (iframe && iframe.contentDocument) {
        const iframeBody = iframe.contentDocument.body
        if (iframeBody) {
          iframeBody.style.filter = filter
          console.log('🎨 Filtro aplicado no iframe')
        }
      }
    } catch (error) {
      console.error('Erro ao aplicar filtros em elementos internos:', error)
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
        console.log('🔄 Fullscreen mudou, reaplicando filtros...')
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

  // Aplicar tema salvo ao container quando estiver pronto
  useEffect(() => {
    if (viewerRef.current && selectedTheme) {
      const theme = themes.find(t => t.id === selectedTheme)
      if (theme) {
        viewerRef.current.style.filter = theme.filter
      }
    }
  }, [selectedTheme, open])

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
    if (!onAtualizarProgresso || !materialId) return
    
    setSavingProgress(true)
    try {
      await onAtualizarProgresso(currentPage)
      
      // Salvar histórico de leitura apenas com o delta desde o último salvamento
      const deltaSeconds = Math.max(0, elapsedTime - lastSavedElapsedSeconds)
      if (deltaSeconds > 0) {
        await saveReadingHistory(currentPage, deltaSeconds)
        setLastSavedElapsedSeconds(elapsedTime)
      }
      
    } catch (error) {
      console.error('Erro ao salvar progresso:', error)
    } finally {
      setSavingProgress(false)
    }
  }

  const handleAdicionarAssunto = async () => {
    if (!assuntoInput.trim() || !materialId) return
    
    setAdicionandoAssunto(true)
    try {
      // Calcular delta desde o último salvamento
      const deltaSeconds = Math.max(0, elapsedTime - lastSavedElapsedSeconds)
      if (deltaSeconds <= 0) {
        console.log('⏱️ Sem tempo novo desde o último salvamento; ignorando criação de mini sessão')
        return
      }
      const tempoMinutos = deltaSeconds / 60
      
      // Salvar mini sessão com assunto
      const response = await fetch(`/api/material/${materialId}/mini-sessao-com-assunto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paginaAtual: currentPage,
          tempoLeituraMinutos: tempoMinutos,
          assunto: assuntoInput.trim()
        }),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Assunto adicionado com sucesso:', result)
        
        // Limpar input
        setAssuntoInput('')
        
        // Atualizar marcador de último salvamento (não reinicia cronômetro)
        setLastSavedElapsedSeconds(elapsedTime)

        // Notificar que uma mini sessão foi criada
        if (onMiniSessaoCriada) {
          onMiniSessaoCriada()
        }
        
        // Mostrar feedback visual (sem toast)
        console.log('📝 Assunto adicionado à mini sessão')
        
        // Nota: Mini sessões individuais não atualizam o progresso automaticamente
        // O progresso é atualizado apenas quando sessões são criadas no tab "Criar Sessão"
      } else {
        const error = await response.json()
        console.error('❌ Erro ao adicionar assunto:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        })
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar assunto:', error)
    } finally {
      setAdicionandoAssunto(false)
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

  // Função para carregar anotações salvas
  const loadSavedAnnotations = async () => {
    if (!webViewerInstanceRef.current || !materialId) {
      console.log('❌ WebViewer não inicializado ou materialId não encontrado')
      return
    }

    try {
      console.log('🔄 Carregando anotações salvas...')
      
      // Primeiro, verificar se o PDF já tem anotações incorporadas
      const { documentViewer, annotationManager } = webViewerInstanceRef.current.Core
      
      // Verificar se o documento está carregado
      if (!documentViewer.getDocument()) {
        console.log('⏳ Documento ainda não carregado, aguardando...')
        return
      }
      
      // Aguardar um pouco para garantir que o documento está totalmente carregado
      await new Promise(resolve => setTimeout(resolve, 200)) // Reduzido de 500 para 200ms
      
      // Verificar se já existem anotações no documento
      const existingAnnotations = annotationManager.getAnnotationsList()
      console.log('📋 Anotações já existentes no PDF:', existingAnnotations.length)
      
      if (existingAnnotations.length > 0) {
        console.log('✅ PDF já contém anotações incorporadas')
        setAnnotationsLoaded(true)
        return // Não precisa carregar do banco se o PDF já tem anotações
      }
      
      // Se não há anotações no PDF, tentar carregar do banco de dados
      const response = await fetch(`/api/material/${materialId}/anotacoes`)
      if (response.ok) {
        const anotacoes = await response.json()
        console.log('📋 Anotações encontradas no banco:', anotacoes.length)
        
        if (anotacoes.length > 0) {
          // Converter anotações do banco para formato XFDF
          const xfdfString = convertAnnotationsToXFDF(anotacoes)
          
          if (xfdfString) {
            // Verificar novamente se o documento está carregado antes de importar
            if (documentViewer.getDocument()) {
              await annotationManager.importAnnotations(xfdfString)
              console.log('✅ Anotações do banco carregadas com sucesso')
              setAnnotationsLoaded(true)
            } else {
              console.log('❌ Documento não está carregado, não foi possível importar anotações')
            }
          }
        } else {
          console.log('ℹ️ Nenhuma anotação encontrada no banco de dados')
          setAnnotationsLoaded(true)
        }
      } else {
        console.log('ℹ️ Nenhuma anotação encontrada no banco de dados')
        setAnnotationsLoaded(true)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar anotações:', error)
      setAnnotationsLoaded(true) // Marcar como carregado mesmo em caso de erro
    }
  }

  // Função para salvar anotações automaticamente quando forem criadas/modificadas
  const setupAnnotationListeners = () => {
    if (!webViewerInstanceRef.current || !materialId) return
    
    const { annotationManager } = webViewerInstanceRef.current.Core
    
    // Listener para quando uma anotação é adicionada
    const handleAnnotationAdded = async (annotations: any[]) => {
      console.log('📝 Nova anotação adicionada:', annotations.length)
      
      // Salvar anotações no banco de dados
      try {
        const annotationsData = annotations.map((ann: any) => ({
          pagina: ann.PageNumber,
          texto: ann.Contents || '',
          posicaoX: ann.X || 0,
          posicaoY: ann.Y || 0,
          largura: ann.Width || 100,
          altura: ann.Height || 20,
          cor: ann.Color?.toString() || '#ffff00',
          tipo: ann.Subject || 'highlight'
        }))
        
        const response = await fetch(`/api/material/${materialId}/anotacoes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(annotationsData)
        })
        
        if (response.ok) {
          console.log('✅ Anotações salvas no banco de dados')
        }
      } catch (error) {
        console.error('❌ Erro ao salvar anotações no banco:', error)
      }
    }
    
    // Listener para quando uma anotação é modificada
    const handleAnnotationChanged = async (annotations: any[]) => {
      console.log('✏️ Anotação modificada:', annotations.length)
      await handleAnnotationAdded(annotations)
    }
    
    // Listener para quando uma anotação é removida
    const handleAnnotationDeleted = async (annotations: any[]) => {
      console.log('🗑️ Anotação removida:', annotations.length)
      // Recarregar todas as anotações do banco
      await loadSavedAnnotations()
    }
    
    // Adicionar listeners
    annotationManager.addEventListener('annotationAdded', handleAnnotationAdded)
    annotationManager.addEventListener('annotationChanged', handleAnnotationChanged)
    annotationManager.addEventListener('annotationDeleted', handleAnnotationDeleted)
    
    console.log('🎧 Listeners de anotações configurados')
  }

  // Função para converter anotações do banco para formato XFDF
  const convertAnnotationsToXFDF = (anotacoes: any[]): string => {
    if (!anotacoes.length) return ''
    
    const annotations = anotacoes.map(anotacao => {
      const baseAnnotation = {
        page: anotacao.pagina,
        rect: [anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura],
        color: anotacao.cor || '#ffff00',
        contents: anotacao.texto || '',
        author: 'User',
        date: anotacao.createdAt || new Date().toISOString()
      }
      
      switch (anotacao.tipo) {
        case 'highlight':
          return {
            ...baseAnnotation,
            type: 'highlight',
            quadPoints: [[anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY, anotacao.posicaoX, anotacao.posicaoY + anotacao.altura, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura]]
          }
        case 'underline':
          return {
            ...baseAnnotation,
            type: 'underline',
            quadPoints: [[anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY, anotacao.posicaoX, anotacao.posicaoY + anotacao.altura, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura]]
          }
        case 'strikeout':
          return {
            ...baseAnnotation,
            type: 'strikeout',
            quadPoints: [[anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY, anotacao.posicaoX, anotacao.posicaoY + anotacao.altura, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura]]
          }
        case 'freetext':
          return {
            ...baseAnnotation,
            type: 'freetext',
            rect: [anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura]
          }
        default:
          return {
            ...baseAnnotation,
            type: 'highlight',
            quadPoints: [[anotacao.posicaoX, anotacao.posicaoY, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY, anotacao.posicaoX, anotacao.posicaoY + anotacao.altura, anotacao.posicaoX + anotacao.largura, anotacao.posicaoY + anotacao.altura]]
          }
      }
    })
    
    // Gerar XFDF básico
    const xfdf = `<?xml version="1.0" encoding="UTF-8"?>
<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">
  <annots>
    ${annotations.map((ann, index) => `
    <${ann.type} page="${ann.page}" rect="${ann.rect.join(',')}" color="${ann.color}" contents="${ann.contents}" author="${ann.author}" date="${ann.date}"${(ann as any).quadPoints ? ` quads="${(ann as any).quadPoints.join(',')}"` : ''} />
    `).join('')}
  </annots>
</xfdf>`
    
    return xfdf
  }

  // Resetar estado quando modal fecha
  useEffect(() => {
    if (!open) {
      setAnnotationsLoaded(false)
      setIsNavigatingToProgress(false)
      setAnnotationsSaved(false) // Resetar indicador de anotações salvas
    }
  }, [open])

  // Carregar anotações quando modal abre e WebViewer está pronto
  useEffect(() => {
    if (open && webViewerInstanceRef.current && !annotationsLoaded) {
      console.log('🔄 Modal aberto, verificando se documento está pronto...')
      
      const { documentViewer } = webViewerInstanceRef.current.Core
      
      // Verificar se o documento está carregado
      if (documentViewer.getDocument()) {
        console.log('✅ Documento já carregado, carregando anotações...')
        setTimeout(() => {
          loadSavedAnnotations()
        }, 100)
      } else {
        console.log('⏳ Documento ainda não carregado, aguardando...')
        // Tentar novamente em alguns momentos
        const checkInterval = setInterval(() => {
          if (documentViewer.getDocument() && !annotationsLoaded) {
            console.log('✅ Documento carregado, carregando anotações...')
            loadSavedAnnotations()
            clearInterval(checkInterval)
          }
        }, 500)
        
        // Limpar intervalo após 10 segundos para evitar loop infinito
        setTimeout(() => {
          clearInterval(checkInterval)
        }, 10000)
      }
    }
  }, [open, webViewerInstanceRef.current, annotationsLoaded])

  useEffect(() => {
    if (open && pdfUrl) {
      const initWebViewer = async () => {
        try {
          const element = await waitForElement(() => viewerRef.current)
          
          const { default: WebViewer } = await import('@pdftron/webviewer')
          
          const instance = await WebViewer({
            path: '/lib/webviewer',
            licenseKey: process.env.NEXT_PUBLIC_PDFTRON_LICENSE_KEY,
            initialDoc: getPdfUrlWithTimestamp(),
            fullAPI: true,
            enableFilePicker: false,
            enableRedaction: false,
            enableMeasurement: false,
            enableAnnotations: true,
            disabledElements: [
              // Manter interface limpa, mas permitir anotações básicas
              'pageNavOverlay',
              'searchOverlay',
              'menuOverlay'
            ]
          }, element)

          webViewerInstanceRef.current = instance

          const { documentViewer, Tools } = instance.Core

          // Configurar modo pan e ajuste de largura
          instance.UI.setToolMode(Tools.ToolNames.PAN)
          instance.UI.setFitMode(instance.UI.FitMode.FitWidth)

          // Desabilitar zoom com scroll
          instance.UI.disableFeatures([instance.UI.Feature.MouseWheelZoom])

          // Habilitar ferramentas de anotação
          instance.UI.enableFeatures([
            instance.UI.Feature.Annotations,
            instance.UI.Feature.NotesPanel
          ])

          // Configurar ferramentas disponíveis
          instance.UI.setToolbarGroup('toolbarGroup-Annotate')
          
          console.log('✅ Anotações habilitadas no WebViewer')

          // Event listeners
          documentViewer.addEventListener('documentLoaded', () => {
            console.log('✅ PDF carregado com sucesso')
            console.log(`📖 Página de progresso a carregar: ${paginaProgresso}`)
            
            // Adicionar botão de salvar anotações no header do WebViewer
            if (materialId) {
              setTimeout(() => {
                addSaveButtonToHeader()
              }, 1000)
            }
            
            // Carregar anotações salvas após o documento estar carregado
            setTimeout(() => {
              if (!annotationsLoaded) {
                loadSavedAnnotations()
              }
            }, 800) // Reduzido de 1500 para 800ms
            
            // Configurar listeners para salvar anotações automaticamente
            setTimeout(() => {
              setupAnnotationListeners()
            }, 1200) // Reduzido de 2000 para 1200ms
            
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
                console.log('🖱️ Configurando scroll da rodinha do mouse...')
                
                // Função para handle do wheel event
                const handleWheel = (e: Event) => {
                  const wheelEvent = e as WheelEvent
                  wheelEvent.preventDefault()
                  wheelEvent.stopPropagation()
                  
                  if (scrollViewElement && wheelEvent.deltaY !== 0) {
                    // Scroll mais suave e responsivo
                    const scrollAmount = wheelEvent.deltaY * 1.5
                    scrollViewElement.scrollTop += scrollAmount
                    
                    console.log(`🔄 Scroll: ${scrollAmount}px (deltaY: ${wheelEvent.deltaY})`)
                  }
                }
                
                // Remover event listeners anteriores se existirem
                scrollViewElement.removeEventListener('wheel', handleWheel)
                
                // Adicionar novo event listener
                scrollViewElement.addEventListener('wheel', handleWheel, { passive: false })
                
                // Também configurar no container pai para garantir que funcione
                const viewerContainer = viewerRef.current
                if (viewerContainer) {
                  viewerContainer.addEventListener('wheel', handleWheel, { passive: false })
                }
                
                console.log('✅ Scroll da rodinha configurado com sucesso!')
              } else {
                console.warn('⚠️ ScrollViewElement não encontrado')
              }
            }, 200)

            // Navegar para a página de progresso salva DENTRO do documentLoaded
            if (paginaProgresso && paginaProgresso > 1) {
              console.log(`🎯 Navegando para página de progresso salva: ${paginaProgresso}`)
              
              // Ativar estado de navegação
              setIsNavigatingToProgress(true)
              
              // Função para tentar navegar com retry
              const attemptNavigation = (attempts = 0, maxAttempts = 3) => {
                setTimeout(() => {
                  try {
                    const totalPages = documentViewer.getPageCount()
                    console.log(`📊 Tentativa ${attempts + 1}: Total de páginas: ${totalPages}`)
                    
                    if (totalPages > 0 && paginaProgresso <= totalPages) {
                      documentViewer.setCurrentPage(paginaProgresso, true)
                      console.log(`✅ Navegação concluída para página ${paginaProgresso}`)
                      
                      // Desativar estado de navegação
                      setIsNavigatingToProgress(false)
                    } else if (totalPages === 0 && attempts < maxAttempts) {
                      // Se ainda não carregou, tentar novamente
                      console.log(`🔄 Tentativa ${attempts + 1} falhou, tentando novamente...`)
                      attemptNavigation(attempts + 1, maxAttempts)
                    } else if (paginaProgresso > totalPages) {
                      console.warn(`⚠️ Página ${paginaProgresso} excede total de páginas (${totalPages})`)
                      documentViewer.setCurrentPage(1, true)
                      
                      // Desativar estado de navegação
                      setIsNavigatingToProgress(false)
                    } else {
                      // Fallback para primeira página após todas as tentativas
                      console.warn('⚠️ Todas as tentativas falharam, iniciando na primeira página')
                      documentViewer.setCurrentPage(1, true)
                      
                      // Desativar estado de navegação
                      setIsNavigatingToProgress(false)
                    }
                  } catch (error) {
                    console.error(`❌ Erro na tentativa ${attempts + 1}:`, error)
                    
                    if (attempts < maxAttempts) {
                      // Tentar novamente
                      attemptNavigation(attempts + 1, maxAttempts)
                    } else {
                      // Fallback para primeira página após todas as tentativas
                      documentViewer.setCurrentPage(1, true)
                      
                      // Desativar estado de navegação
                      setIsNavigatingToProgress(false)
                    }
                  }
                }, attempts === 0 ? 1000 : 500) // Primeira tentativa com delay maior
              }
              
              // Iniciar tentativas de navegação
              attemptNavigation()
            } else {
              console.log('📄 Iniciando na primeira página (sem progresso salvo)')
            }
          })

          // Event listener para página atual
          documentViewer.addEventListener('pageNumberUpdated', (pageNumber) => {
            setCurrentPage(pageNumber)
            console.log(`📄 Página atual: ${pageNumber}`)
          })

          documentViewer.addEventListener('error', (err) => {
            console.error('❌ Erro no WebViewer:', err)
          })

        } catch (error) {
          console.error('❌ Erro ao inicializar WebViewer:', error)
        }
      }

      initWebViewer()
    }

    return () => {
      if (webViewerInstanceRef.current) {
        webViewerInstanceRef.current = null
      }
      // Resetar estado de navegação quando modal for fechado
      setIsNavigatingToProgress(false)
      setAnnotationsLoaded(false) // Resetar estado de anotações carregadas
    }
  }, [open, pdfUrl, pdfTimestamp]) // Removido isNavigatingToProgress das dependências

  if (!open || !pdfUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 border-0 rounded-none bg-gray-100">
        <DialogHeader className="sr-only">
          <DialogTitle>Visualizador de PDF</DialogTitle>
          <DialogDescription>
            Visualize e navegue pelo documento PDF
          </DialogDescription>
        </DialogHeader>

        {/* Container principal em tela cheia */}
        <div className="flex flex-col w-full h-full bg-white relative">
          
          {/* Overlay de Loading para Navegação */}
          {isNavigatingToProgress && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16">
                  <svg className="animate-spin w-16 h-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Carregando sua posição de leitura
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Navegando para página {paginaProgresso}...
                  </p>
                  
                  {/* Barra de Progresso Animada */}
                  <div className="w-64 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{
                      animation: 'loading-bar 2s ease-in-out infinite'
                    }}></div>
                  </div>
                  
                  <style jsx>{`
                    @keyframes loading-bar {
                      0% { width: 0%; }
                      50% { width: 70%; }
                      100% { width: 100%; }
                    }
                  `}</style>
                </div>
              </div>
            </div>
          )}
          
          {/* Header fixo com controles */}
          <div 
            className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 shadow-sm flex-shrink-0 z-50 transition-all duration-300"
            style={{ 
              filter: themes.find(t => t.id === selectedTheme)?.filter || 'none'
            }}
          >
            <div className="flex items-center gap-4">
              {/* Botão fechar */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full p-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
              
              <div className="h-4 w-px bg-gray-300" />
              
              {/* Indicador de Anotações Salvas */}
              {annotationsSaved && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full">
                  <div className="w-4 h-4">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  <span className="text-xs text-green-700 font-medium">
                    Anotações salvas
                  </span>
                </div>
              )}
              
              {/* Indicador de Navegação para Progresso */}
              {isNavigatingToProgress && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                  <div className="w-4 h-4">
                    <svg className="animate-spin w-4 h-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <span className="text-xs text-blue-700 font-medium">
                    Carregando página {paginaProgresso}...
                  </span>
                </div>
              )}
              
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
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[140px]">
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
              
              <div className="text-xs text-gray-400">
                🎨 Visualizador com Temas
              </div>
            </div>
            
            {/* Lado direito - controles */}
            <div className="flex items-center gap-4">
              {/* Input para adicionar assuntos */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Adicionar assunto..."
                  value={assuntoInput}
                  onChange={(e) => setAssuntoInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAdicionarAssunto()}
                  className="w-48 px-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={adicionandoAssunto}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAdicionarAssunto}
                  disabled={!assuntoInput.trim() || adicionandoAssunto}
                  className="text-xs h-8 px-3 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 shadow-sm"
                >
                  {adicionandoAssunto ? (
                    <>
                      <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin mr-1" />
                      Adicionando...
                    </>
                  ) : (
                    '📝 Adicionar'
                  )}
                </Button>
              </div>
              
              {onAtualizarProgresso && (
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

          {/* Container do WebViewer - ocupa todo espaço restante */}
          <div className="flex-1 relative bg-gray-50 overflow-hidden">
            <div 
              ref={viewerRef} 
              className="absolute inset-0 w-full h-full transition-all duration-300" 
              style={{ 
                filter: themes.find(t => t.id === selectedTheme)?.filter || 'none'
              }}
            />
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  )
} 