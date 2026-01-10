'use client'

import { CheckCircle2, AlertCircle, Loader2, FileText } from 'lucide-react'
import { ProcessingStatus } from '@/hooks/usePdfBatchProcessing'

interface ProcessingProgressBarProps {
  status: ProcessingStatus | null
  isProcessing: boolean
  error?: string | null
  onRetry?: () => void
}

export function ProcessingProgressBar({
  status,
  isProcessing,
  error,
  onRetry,
}: ProcessingProgressBarProps) {
  if (!status) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-100 border-b border-gray-300 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm text-gray-700">Carregando informações...</span>
        </div>
      </div>
    )
  }

  if (status.isComplete) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-green-50 border-b border-green-200 p-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Processamento completo - {status.totalPages} páginas prontas para leitura
          </span>
        </div>
      </div>
    )
  }

  if (status.hasError || error) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-red-700 font-medium">
              Erro no processamento
            </span>
          </div>
          {(status.processingError || error) && (
            <p className="text-xs text-red-600 ml-8">
              {status.processingError || error}
            </p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-8 mt-2 text-xs text-red-700 hover:text-red-800 underline"
            >
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!status.hasStarted) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-blue-50 border-b border-blue-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-blue-700">
            PDF com {status.totalPages} páginas - Processamento será iniciado automaticamente
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header com status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <FileText className="w-5 h-5 text-blue-600" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {isProcessing ? 'Processando PDF...' : 'Processamento em andamento'}
              </p>
              <p className="text-xs text-gray-600">
                {status.processedPages} de {status.totalPages} páginas processadas
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-lg font-bold text-blue-600">{status.progress}%</p>
            <p className="text-xs text-gray-600">
              {status.totalPages - status.processedPages} páginas restantes
            </p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
            style={{ width: `${status.progress}%` }}
          >
            {/* Animação de progresso */}
            {isProcessing && (
              <div className="absolute top-0 left-0 right-0 h-full bg-white/30 animate-pulse" />
            )}
          </div>
        </div>

        {/* Informação adicional */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>Última página: {status.lastProcessedPage}</span>
          <span>
            {isProcessing
              ? 'Processando próximo lote...'
              : 'Você pode começar a ler enquanto processamos o restante'}
          </span>
        </div>
      </div>
    </div>
  )
}
