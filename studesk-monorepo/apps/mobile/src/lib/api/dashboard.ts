/**
 * API Client para Dashboard
 */

import { apiClient } from '../api-client'

export interface MateriaDoDia {
  id: string
  disciplinaId: string
  disciplinaNome: string
  disciplinaCor?: string
  horasPlanejadas: number
  horasRealizadas: number
  tempoRealEstudo: number
  tempoSessoesPdf: number
  concluida: boolean
  materialNome?: string
  questoesPlanejadas: number
  questoesRealizadas: number
  prioridade: number
  observacoes?: string
}

export interface DashboardStats {
  totalMateriais: number
  totalDisciplinas: number
  materiaisRecentes: Array<{
    id: string
    nome: string
    paginaAtual: number
    totalPaginas: number
    createdAt: string
  }>
  tempoEstudadoHoje: number
}

export interface DashboardApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const dashboardApi = {
  /**
   * Buscar matérias/disciplinas do dia
   */
  async getMateriasDoDia(data?: Date): Promise<MateriaDoDia[]> {
    const params = data ? `?data=${data.toISOString()}` : ''
    console.log('🔵 [dashboardApi] Buscando matérias do dia:', `/dashboard/materias-do-dia${params}`)

    const response = await apiClient.get<DashboardApiResponse<MateriaDoDia[]>>(
      `/dashboard/materias-do-dia${params}`
    )

    console.log('🟢 [dashboardApi] Resposta getMateriasDoDia:', response)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar matérias do dia')
    }

    return response.data
  },

  /**
   * Buscar estatísticas gerais do dashboard
   */
  async getStats(): Promise<DashboardStats> {
    console.log('🔵 [dashboardApi] Buscando stats:', '/dashboard/stats')

    const response = await apiClient.get<DashboardApiResponse<DashboardStats>>(
      '/dashboard/stats'
    )

    console.log('🟢 [dashboardApi] Resposta getStats:', response)

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar estatísticas')
    }

    return response.data
  }
}
