import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Rotas públicas que não precisam de autenticação
const publicRoutes = ['/login', '/register', '/api/auth']

// Verifica se a rota é pública
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

// Valida formato do hash (10 caracteres URL-safe)
function isValidHashFormat(hash: string): boolean {
  return /^[A-Za-z0-9_-]{10}$/.test(hash)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acesso a rotas públicas
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Permitir acesso a arquivos estáticos e API routes que não são de auth
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('/api/') && !pathname.includes('/api/auth')
  ) {
    return NextResponse.next()
  }

  // Obter token JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Se não está autenticado, redirecionar para login
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Extrair hash da URL (formato: /[userHash]/...)
  const pathParts = pathname.split('/').filter(Boolean)

  if (pathParts.length === 0) {
    // Redirecionar root para /{userHash}/hoje
    const userHomeUrl = new URL(`/${token.hash}/hoje`, request.url)
    return NextResponse.redirect(userHomeUrl)
  }

  const urlHash = pathParts[0]

  // Verificar se o primeiro segmento é um hash válido
  if (!isValidHashFormat(urlHash)) {
    // Se não for um hash válido, redirecionar para /{userHash}/hoje
    const userHomeUrl = new URL(`/${token.hash}/hoje`, request.url)
    return NextResponse.redirect(userHomeUrl)
  }

  // Verificar se o hash na URL corresponde ao hash do usuário logado
  if (urlHash !== token.hash) {
    // Tentativa de acessar dados de outro usuário - redirecionar para próprio dashboard
    const userHomeUrl = new URL(`/${token.hash}/hoje`, request.url)
    return NextResponse.redirect(userHomeUrl)
  }

  // Tudo certo, permitir acesso
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
