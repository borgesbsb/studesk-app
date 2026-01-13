'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { TextReader } from '@/components/reader/TextReader'
import { PdfViewer } from '@/components/reader/PdfViewer'
import { FileText, FileImage } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string; userHash: string }>
}

type ViewMode = 'text' | 'pdf'

export default function LerMaterialPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [materialId, setMaterialId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('text')
  const [pdfUrl, setPdfUrl] = useState<string>('')

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params
      setMaterialId(id)

      // Ler modo da query string (se existir)
      const mode = searchParams.get('mode') as ViewMode | null
      if (mode === 'pdf' || mode === 'text') {
        setViewMode(mode)
      }

      // Buscar URL do PDF em background
      try {
        const response = await fetch(`/api/material/${id}`)
        if (response.ok) {
          const data = await response.json()
          if (data.arquivoPdfUrl) {
            setPdfUrl(data.arquivoPdfUrl)
          }
        }
      } catch (error) {
        console.error('Erro ao buscar material:', error)
      } finally {
        // Só desabilita loading após carregar dados iniciais
        setLoading(false)
      }
    }

    loadParams()
  }, [params, searchParams])

  // Loading inicial - mostra enquanto materialId não está disponível
  if (loading || !materialId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center p-8 max-w-md">
          {/* Spinner animado */}
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          {/* Mensagem principal */}
          <h3 className="text-2xl font-bold mb-3 text-gray-800">
            Carregando material
          </h3>

          <p className="text-base mb-4 text-gray-600">
            Preparando o conteúdo para você...
          </p>

          {/* Barra de progresso indeterminada */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 animate-progress"></div>
          </div>

          <p className="text-sm mt-4 text-gray-500 opacity-70">
            Aguarde alguns instantes...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-screen">
      {/* Botão Flutuante para Alternar Visualização */}
      {pdfUrl && (
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

      {/* Conteúdo */}
      {viewMode === 'text' ? (
        <TextReader materialId={materialId} />
      ) : (
        pdfUrl && <PdfViewer pdfUrl={pdfUrl} materialId={materialId} />
      )}
    </div>
  )
}
