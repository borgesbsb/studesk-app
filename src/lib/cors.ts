import { NextResponse } from 'next/server'

const allowedOrigins = [
  'http://localhost:3030',
  'http://localhost:3031',
  'http://127.0.0.1:3030',
  'http://127.0.0.1:3031',
  'http://195.35.17.216:3030',
  'http://195.35.17.216:3031',
  // Adicione outros origins permitidos conforme necessário
]

/**
 * Verifica se a origin é permitida
 * Aceita:
 * - Origins específicas na lista (localhost:3030, localhost:3031, etc)
 * - IPs da rede local na porta 3031 (192.168.x.x:3031, 10.x.x.x:3031)
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false

  // Verifica se está na lista de origins permitidas
  if (allowedOrigins.includes(origin)) return true

  // Aceita qualquer IP da rede local na porta 3031 (para mobile)
  const localNetworkPattern = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):3031$/
  if (localNetworkPattern.test(origin)) return true

  return false
}

export function corsHeaders(origin?: string | null) {
  const allowed = isOriginAllowed(origin)
  const allowedOrigin = allowed && origin ? origin : 'http://localhost:3031'

  console.log('[CORS DEBUG]', {
    receivedOrigin: origin,
    isAllowed: allowed,
    willReturn: allowedOrigin
  })

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

export function handleCors(request: Request) {
  const origin = request.headers.get('origin')
  return corsHeaders(origin)
}

export function corsResponse(data: any, status = 200, request?: Request) {
  const headers = request ? handleCors(request) : corsHeaders()
  return NextResponse.json(data, { status, headers })
}
