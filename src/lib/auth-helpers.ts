import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verify } from 'jsonwebtoken'
import { headers } from 'next/headers'

/**
 * Tipo para dados do usuário autenticado via JWT
 */
interface JWTPayload {
  id: string
  email: string
  hash: string
  iat?: number
  exp?: number
}

/**
 * Verifica token JWT do Authorization header
 */
async function verifyJWTToken(): Promise<JWTPayload | null> {
  try {
    const headersList = await headers()
    const authorization = headersList.get('authorization')

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null
    }

    const token = authorization.substring(7) // Remove 'Bearer '
    const secret = process.env.NEXTAUTH_SECRET || 'fallback-secret'

    const decoded = verify(token, secret) as JWTPayload
    console.log('✅ [JWT] Token verificado para usuário:', decoded.email, 'Hash:', decoded.hash)

    return decoded
  } catch (error) {
    console.error('❌ [JWT] Erro ao verificar token:', error)
    return null
  }
}

/**
 * Retorna o ID do usuário logado ou null
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

/**
 * Retorna o hash do usuário logado ou null
 */
export async function getCurrentUserHash(): Promise<string | null> {
  const session = await getServerSession(authOptions)
  return session?.user?.hash || null
}

/**
 * Retorna a sessão completa do usuário ou null
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions)
}

/**
 * Garante que o usuário está autenticado, caso contrário lança erro
 * Suporta tanto sessões web (NextAuth) quanto tokens JWT (mobile)
 */
export async function requireAuth() {
  // Primeiro tenta obter sessão NextAuth (web)
  const session = await getServerSession(authOptions)

  if (session?.user?.id) {
    console.log('✅ [AUTH] Autenticado via NextAuth session:', session.user.email)
    return {
      userId: session.user.id,
      userHash: session.user.hash,
      userEmail: session.user.email,
      userName: session.user.name,
    }
  }

  // Se não há sessão, tenta validar JWT token (mobile)
  const jwtPayload = await verifyJWTToken()

  if (jwtPayload?.id) {
    console.log('✅ [AUTH] Autenticado via JWT token:', jwtPayload.email)
    return {
      userId: jwtPayload.id,
      userHash: jwtPayload.hash,
      userEmail: jwtPayload.email,
      userName: '', // JWT não contém nome, mas não é necessário para queries
    }
  }

  console.error('❌ [AUTH] Nenhuma autenticação válida encontrada')
  throw new Error('Usuário não autenticado')
}

/**
 * Verifica se o usuário tem permissão para acessar recursos de outro usuário
 */
export async function verifyUserAccess(targetUserId: string): Promise<boolean> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return false
  }

  return session.user.id === targetUserId
}
