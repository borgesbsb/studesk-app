'use client'

import { useState, useEffect } from 'react'
import { dashboardApi, MateriaDoDia, DashboardStats } from '@/lib/api/dashboard'

export function useDashboard() {
  const [materiasDoDia, setMateriasDoDia] = useState<MateriaDoDia[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      console.log('🔵 [useDashboard] Iniciando busca de dados do dashboard...')
      setLoading(true)
      setError(null)

      // Buscar dados em paralelo
      console.log('🔵 [useDashboard] Chamando API getMateriasDoDia e getStats...')
      const [materiasData, statsData] = await Promise.all([
        dashboardApi.getMateriasDoDia(),
        dashboardApi.getStats()
      ])

      console.log('🟢 [useDashboard] Dados recebidos:', {
        materias: materiasData.length,
        stats: statsData
      })

      setMateriasDoDia(materiasData)
      setStats(statsData)
    } catch (err) {
      console.error('🔴 [useDashboard] Erro ao buscar dados do dashboard:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
      console.log('🔵 [useDashboard] Busca finalizada')
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  return {
    materiasDoDia,
    stats,
    loading,
    error,
    refetch: fetchDashboardData
  }
}
