import { useState, useEffect } from 'react'

interface MobileTextData {
  id: string
  materialId: string
  formattedText: string
  tokensUsed: number | null
  aiModel: string | null
  processedAt: Date
  createdAt: Date
  updatedAt: Date
}

interface UseMobileTextReturn {
  text: string | null
  loading: boolean
  error: string | null
  metadata: Omit<MobileTextData, 'formattedText'> | null
  refetch: () => Promise<void>
}

export function useMobileText(materialId: string | undefined): UseMobileTextReturn {
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Omit<MobileTextData, 'formattedText'> | null>(null)

  const fetchMobileText = async () => {
    if (!materialId) {
      setError('Material ID não fornecido')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/pdf/${materialId}/mobile-text`)

      if (!response.ok) {
        if (response.status === 404) {
          // Não é erro - apenas ainda não foi processado
          // O sistema de processamento incremental vai cuidar disso
          console.log('Texto ainda não processado - aguardando processamento incremental')
          setText(null)
          setMetadata(null)
          setLoading(false)
          return
        }
        throw new Error(`Erro ao buscar texto: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.data) {
        setText(data.data.formattedText)
        setMetadata({
          id: data.data.id,
          materialId: data.data.materialId,
          tokensUsed: data.data.tokensUsed,
          aiModel: data.data.aiModel,
          processedAt: new Date(data.data.processedAt),
          createdAt: new Date(data.data.createdAt),
          updatedAt: new Date(data.data.updatedAt),
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao buscar texto formatado:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMobileText()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialId])

  return {
    text,
    loading,
    error,
    metadata,
    refetch: fetchMobileText,
  }
}
