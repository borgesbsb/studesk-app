'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface ProcessingStatus {
  totalPages: number
  processedPages: number
  lastProcessedPage: number
  processingStatus: 'pending' | 'processing' | 'partial' | 'complete' | 'error'
  processingError?: string
  progress: number
  hasStarted: boolean
  isComplete: boolean
  hasError: boolean
}

interface UsePdfBatchProcessingOptions {
  materialId: string
  batchSize?: number
  initialBatchSize?: number // Tamanho do lote inicial (padrão: 5)
  onBatchComplete?: (batch: any) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

export function usePdfBatchProcessing({
  materialId,
  batchSize = 10,
  initialBatchSize = 5,
  onBatchComplete,
  onComplete,
  onError,
}: UsePdfBatchProcessingOptions) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const processingRef = useRef(false)
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Buscar status inicial
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/pdf/process-status/${materialId}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar status')
      }

      const data = await response.json()
      setStatus(data.status)

      return data.status
    } catch (err) {
      console.error('Erro ao buscar status:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      return null
    }
  }, [materialId])

  // Processar um lote
  const processBatch = useCallback(async (startPage?: number, endPage?: number) => {
    try {
      setIsProcessing(true)
      setError(null)

      const response = await fetch('/api/pdf/process-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          materialId,
          startPage,
          endPage,
          batchSize,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar lote')
      }

      const data = await response.json()

      if (data.status) {
        setStatus(data.status)
      }

      if (onBatchComplete && data.batch) {
        onBatchComplete(data.batch)
      }

      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }

      throw err
    } finally {
      setIsProcessing(false)
    }
  }, [materialId, batchSize, onBatchComplete, onError])

  // Processar todos os lotes automaticamente
  const processAll = useCallback(async () => {
    if (processingRef.current) {
      console.log('Processamento já em andamento')
      return
    }

    try {
      processingRef.current = true
      setIsProcessing(true)

      console.log(`🚀 Iniciando processamento completo do PDF...`)

      // Processar primeiro lote
      let result = await processBatch(1, initialBatchSize)

      // Continuar processando até completar
      while (!result.complete) {
        if (!result.status) break

        const nextStart = result.status.lastProcessedPage + 1
        const nextEnd = Math.min(nextStart + batchSize - 1, result.status.totalPages)

        console.log(`📄 Processando páginas ${nextStart}-${nextEnd}...`)

        result = await processBatch(nextStart, nextEnd)
      }

      console.log(`✅ Processamento completo!`)

      if (onComplete) {
        onComplete()
      }

      return result
    } catch (err) {
      console.error('Erro no processamento completo:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [initialBatchSize, batchSize, processBatch, onComplete, onError])

  // Processar próximo lote (sob demanda)
  const processNextBatch = useCallback(async () => {
    if (processingRef.current) {
      console.log('Processamento já em andamento')
      return
    }

    if (!status || status.isComplete) {
      console.log('Processamento já completo')
      return
    }

    try {
      processingRef.current = true
      setIsProcessing(true)

      const startPage = status.lastProcessedPage + 1
      const endPage = Math.min(startPage + batchSize - 1, status.totalPages)

      console.log(`Processando próximo lote (páginas ${startPage}-${endPage})...`)

      const result = await processBatch(startPage, endPage)

      if (result.complete && onComplete) {
        onComplete()
      }

      return result
    } catch (err) {
      console.error('Erro no processamento do próximo lote:', err)
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)

      if (onError) {
        onError(err instanceof Error ? err : new Error(errorMessage))
      }
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [status, batchSize, processBatch, onComplete, onError])

  // Cancelar processamento
  const cancel = useCallback(() => {
    processingRef.current = false
    setIsProcessing(false)

    if (statusCheckIntervalRef.current) {
      clearInterval(statusCheckIntervalRef.current)
      statusCheckIntervalRef.current = null
    }
  }, [])

  // Buscar status inicial ao montar (APENAS UMA VEZ)
  useEffect(() => {
    fetchStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId]) // Dependência APENAS de materialId, não de fetchStatus

  // Processar todos os lotes automaticamente quando o status estiver disponível
  // DESABILITADO - processamento automático causava duplicação
  // useEffect(() => {
  //   if (status && !status.hasStarted && !processingRef.current) {
  //     console.log('🚀 Iniciando processamento automático completo...')
  //     processAll()
  //   }
  // }, [status, processAll])

  // DESABILITADO: Verificação periódica de status causava loop infinito
  // O status já é atualizado quando processamos cada lote via processBatch()
  // Não precisamos fazer polling automático a cada 3 segundos
  // useEffect(() => {
  //   if (isProcessing && !statusCheckIntervalRef.current) {
  //     statusCheckIntervalRef.current = setInterval(() => {
  //       fetchStatus()
  //     }, 3000) // Verificar a cada 3 segundos
  //   }
  //
  //   if (!isProcessing && statusCheckIntervalRef.current) {
  //     clearInterval(statusCheckIntervalRef.current)
  //     statusCheckIntervalRef.current = null
  //   }
  //
  //   return () => {
  //     if (statusCheckIntervalRef.current) {
  //       clearInterval(statusCheckIntervalRef.current)
  //       statusCheckIntervalRef.current = null
  //     }
  //   }
  // }, [isProcessing, fetchStatus])

  return {
    status,
    isProcessing,
    error,
    processBatch,
    processAll,
    processNextBatch,
    cancel,
    fetchStatus,
  }
}
