'use client'

import { useEffect, useState } from 'react'
import { dashboardApi, type MateriaDoDia } from '@/lib/api/dashboard'
import { useDashboard } from '@/contexts/dashboard-context'
import { MateriasHoje } from './MateriasHoje'

export function MateriasHojeWrapper() {
  const { selectedDate } = useDashboard()
  const [materias, setMaterias] = useState<MateriaDoDia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const carregarMaterias = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await dashboardApi.getMateriasDoDia(selectedDate)
      setMaterias(data)
    } catch (err) {
      console.error('Erro ao carregar matérias:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar matérias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarMaterias()
  }, [selectedDate])

  return (
    <MateriasHoje
      materias={materias}
      loading={loading}
      error={error}
      onRefresh={carregarMaterias}
    />
  )
}
