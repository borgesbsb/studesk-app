/**
 * API Client para Materiais de Estudo
 */

import { apiClient } from '../api-client'

export interface Material {
  id: string
  nome: string
  tipo: string
  arquivoPdfUrl: string
  totalPaginas: number
  paginasLidas: number
  userId: string
  fonteOrigem?: string
  createdAt: string
  updatedAt: string
  disciplinas?: Array<{
    disciplinaId: string
    disciplinaNome: string
    disciplinaCor?: string
  }>
}

// Mantém compatibilidade com código existente
export type MaterialEstudo = Material

export interface MateriaisApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export const materiaisApi = {
  /**
   * Listar todos os materiais do usuário
   */
  async list(): Promise<MaterialEstudo[]> {
    const response = await apiClient.get<MateriaisApiResponse<MaterialEstudo[]>>(
      '/materiais'
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar materiais')
    }

    return response.data
  },

  /**
   * Buscar material por ID
   */
  async getById(id: string): Promise<MaterialEstudo> {
    const response = await apiClient.get<MateriaisApiResponse<MaterialEstudo>>(
      `/materiais/${id}`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar material')
    }

    return response.data
  },

  /**
   * Listar materiais por disciplina
   */
  async listByDisciplina(disciplinaId: string): Promise<Material[]> {
    const response = await apiClient.get<MateriaisApiResponse<Material[]>>(
      `/disciplinas/${disciplinaId}/materiais`
    )

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Erro ao buscar materiais da disciplina')
    }

    return response.data
  }
}
