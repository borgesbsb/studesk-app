/**
 * Utilitário para obter URL base da API backend
 * Detecta dinamicamente baseado no hostname atual
 */

/**
 * Retorna a URL base do backend (sem /api no final)
 * Exemplo: http://localhost:3030 ou https://studesk.pro
 */
export function getBackendBaseUrl(): string {
  // No servidor, retornar URL genérica (será sobrescrita no cliente)
  if (typeof window === 'undefined') {
    return 'http://localhost:3030'
  }

  // No cliente, detectar baseado no hostname atual
  const hostname = window.location.hostname
  const protocol = window.location.protocol

  console.log('🟠 [api-base-url] Detectando URL do backend:', { hostname, protocol })

  // Se for emulador Android (10.0.2.2), usar 10.0.2.2:3030
  if (hostname === '10.0.2.2') {
    const url = 'http://10.0.2.2:3030'
    console.log('🟠 [api-base-url] URL do backend (emulador):', url)
    return url
  }

  // Se for localhost, usar localhost:3030 (desenvolvimento - backend separado)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = 'http://localhost:3030'
    console.log('🟠 [api-base-url] URL do backend (localhost):', url)
    return url
  }

  // Em produção, usar a mesma origem (protocolo e hostname atual, sem porta extra)
  // Exemplo: https://studesk.pro
  const url = `${protocol}//${hostname}`
  console.log('🟠 [api-base-url] URL do backend (produção):', url)
  return url
}

/**
 * Retorna a URL completa da API (com /api no final)
 * Exemplo: http://localhost:3030/api ou https://studesk.pro/api
 */
export function getApiBaseUrl(): string {
  return `${getBackendBaseUrl()}/api`
}
