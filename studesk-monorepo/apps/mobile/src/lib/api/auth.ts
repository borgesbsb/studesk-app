/**
 * API de Autenticação
 */

import { apiClient } from '../api-client'
import type { ApiResponse } from '@studesk/types'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
}

export const authApi = {
  /**
   * Login do usuário
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthUser>> {
    return apiClient.post('/auth/login', credentials)
  },

  /**
   * Registro de novo usuário
   */
  async register(data: RegisterData): Promise<ApiResponse<AuthUser>> {
    return apiClient.post('/auth/register', data)
  },

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse> {
    return apiClient.post('/auth/logout')
  },

  /**
   * Verificar sessão
   */
  async getSession(): Promise<ApiResponse<AuthUser | null>> {
    return apiClient.get('/auth/session')
  },
}
