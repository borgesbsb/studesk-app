'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { TextReader } from '@/components/reader/TextReader'
import { PdfViewer } from '@/components/reader/PdfViewer'
import { FileText, FileImage, Cloud, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface PageProps {
  params: Promise<{ id: string; userHash: string }>
}

type ViewMode = 'text' | 'pdf'

export default function LerMaterialPage({ params }: PageProps) {
  const searchParams = useSearchParams()
  const [materialId, setMaterialId] = useState<string>('')
  const [googleDriveFileId, setGoogleDriveFileId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('text')
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [driveNotConnected, setDriveNotConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const checkDriveAndSetUrl = useCallback(async (fileId: string) => {
    const statusRes = await fetch('/api/google-drive/files').catch(() => null)
    if (statusRes && statusRes.status === 401) {
      setDriveNotConnected(true)
      setPdfUrl('')
    } else {
      setDriveNotConnected(false)
      setPdfUrl(`/api/google-drive/download-pdf?fileId=${fileId}`)
    }
  }, [])

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params
      setMaterialId(id)

      const mode = searchParams.get('mode') as ViewMode | null
      if (mode === 'pdf' || mode === 'text') {
        setViewMode(mode)
      }

      try {
        const response = await fetch(`/api/material/${id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.arquivoPdfUrl) {
            setPdfUrl(data.arquivoPdfUrl)
          } else if (data.googleDriveFileId) {
            setGoogleDriveFileId(data.googleDriveFileId)
            await checkDriveAndSetUrl(data.googleDriveFileId)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar material:', error)
      } finally {
        setLoading(false)
      }
    }

    loadParams()
  }, [params, searchParams, checkDriveAndSetUrl])

  const handleConnectDrive = async () => {
    setIsConnecting(true)
    try {
      const response = await fetch('/api/google-drive/auth')
      const data = await response.json()

      if (!data.authUrl) throw new Error('URL de autenticação não recebida')

      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const authWindow = window.open(
        data.authUrl,
        'Google Drive Authorization',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      const messageHandler = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          window.removeEventListener('message', messageHandler)
          toast.success('Google Drive conectado! Carregando PDF...')
          if (googleDriveFileId) {
            await checkDriveAndSetUrl(googleDriveFileId)
          }
        } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
          window.removeEventListener('message', messageHandler)
          toast.error(event.data.error || 'Erro ao conectar com Google Drive')
        }
      }

      window.addEventListener('message', messageHandler)

      const checkClosed = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkClosed)
          window.removeEventListener('message', messageHandler)
          setIsConnecting(false)
        }
      }, 500)
    } catch (error) {
      console.error('Erro ao conectar Google Drive:', error)
      toast.error('Erro ao iniciar conexão com Google Drive')
      setIsConnecting(false)
    }
  }

  if (loading || !materialId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-3 text-gray-800">Carregando material</h3>
          <p className="text-base mb-4 text-gray-600">Preparando o conteúdo para você...</p>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 animate-progress"></div>
          </div>
          <p className="text-sm mt-4 text-gray-500 opacity-70">Aguarde alguns instantes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen">
      {/* Botão Flutuante para Alternar Visualização */}
      {(pdfUrl || driveNotConnected) && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setViewMode(viewMode === 'text' ? 'pdf' : 'text')}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105"
            title={viewMode === 'text' ? 'Ver PDF Original' : 'Ver Texto Formatado'}
          >
            {viewMode === 'text' ? (
              <>
                <FileImage className="w-5 h-5" />
                <span className="font-medium">PDF Original</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span className="font-medium">Texto Formatado</span>
              </>
            )}
          </button>
        </div>
      )}

      {viewMode === 'text' ? (
        <TextReader materialId={materialId} />
      ) : driveNotConnected ? (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cloud className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Google Drive não conectado</h3>
            <p className="text-gray-600 mb-6">
              Este PDF está armazenado no Google Drive. Conecte sua conta para visualizá-lo.
            </p>
            <button
              onClick={handleConnectDrive}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Cloud className="w-5 h-5" />
                  Conectar Google Drive
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <PdfViewer pdfUrl={pdfUrl} materialId={materialId} />
      )}
    </div>
  )
}
