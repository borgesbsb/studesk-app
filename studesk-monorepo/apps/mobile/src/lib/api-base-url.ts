/**
 * Utilitário para obter URL base da API backend
 * Detecta dinamicamente baseado no hostname atual
 */

/**
 * Retorna a URL base do backend (sem /api no final)
 * Exemplo: http://localhost:3030 ou http://192.168.15.8:3030
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

  // Se for localhost, usar localhost:3030
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const url = 'http://localhost:3030'
    console.log('🟠 [api-base-url] URL do backend (localhost):', url)
    return url
  }

  // Se for IP da rede, usar o mesmo IP na porta 3030
  const url = `${protocol}//${hostname}:3030`
  console.log('🟠 [api-base-url] URL do backend (rede):', url)
  return url
}

/**
 * Retorna a URL completa da API (com /api no final)
 * Exemplo: http://localhost:3030/api ou http://192.168.15.8:3030/api
 */
export function getApiBaseUrl(): string {
  return `${getBackendBaseUrl()}/api`
}
