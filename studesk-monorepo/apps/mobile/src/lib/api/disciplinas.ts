/**
 * API Client para Disciplinas
 */

import { apiClient } from '../api-client'

export interface Disciplina {
  id: string
  nome: string
  cor?: string
  icone?: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface DisciplinasApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const disciplinasApi = {
  /**
   * Listar todas as disciplinas do usuário
   */
  async list(): Promise<Disciplina[]> {
    const response = await apiClient.get<DisciplinasApiResponse<Disciplina[]>>(
      '/disciplinas'
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar disciplinas')
    }

    return response.data
  },

  /**
   * Buscar disciplina por ID
   */
  async getById(id: string): Promise<Disciplina> {
    const response = await apiClient.get<DisciplinasApiResponse<Disciplina>>(
      `/disciplinas/${id}`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar disciplina')
    }

    return response.data
  }
}
