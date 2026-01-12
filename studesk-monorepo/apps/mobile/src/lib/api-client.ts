/**
 * Cliente API para consumir backend do app web
 * Base URL: detectada dinamicamente baseada no hostname
 */

import type { ApiResponse } from '@studesk/types'

// Detectar a URL da API baseada no hostname atual - DINAMICAMENTE
function getApiBaseUrl(): string {
  // No servidor, retornar URL genérica (será sobrescrita no cliente)
  if (typeof window === 'undefined') {
    return '/api'
  }

  // No cliente, detectar baseado no hostname atual
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  console.log('🟠 [api-client] Detectando URL da API:', { hostname, protocol })

  // Se for localhost, usar localhost:3030 (desenvolvimento)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = 'http://localhost:3030/api'
    console.log('🟠 [api-client] URL da API (localhost - backend):', url)
    return url
  }

  // Em produção (studesk.pro), usar APIs locais do próprio mobile
  const url = '/api'
  console.log('🟠 [api-client] URL da API (produção - APIs locais):', url)
  return url
}

interface RequestOptions extends RequestInit {
  token?: string
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Detectar URL dinamicamente em cada requisição
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}${endpoint}`

    console.log('🔵 [api-client] Fazendo requisição:', {
      method: fetchOptions.method || 'GET',
      baseUrl,
      endpoint,
      fullUrl: url
    })

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Incluir cookies de sessão em requisições cross-origin
      })

      console.log('🟢 [api-client] Resposta recebida:', {
        url,
        status: response.status,
        ok: response.ok
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))
        console.error('🔴 [api-client] Erro na resposta:', { url, status: response.status, error })
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`🔴 [api-client] Erro na requisição [${endpoint}]:`, error)
      throw error
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // Upload de arquivo
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<T> {
    const { token, ...fetchOptions } = options || {}

    const headers: Record<string, string> = {
      ...(fetchOptions.headers as Record<string, string> || {}),
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    // Detectar URL dinamicamente
    const baseUrl = getApiBaseUrl()
    const url = `${baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...fetchOptions,
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return await response.json()
  }
}

// Instância singleton do cliente
export const apiClient = new ApiClient()

// Exportar tipos
export type { ApiResponse }
