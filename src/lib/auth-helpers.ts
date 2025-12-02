import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

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
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error('Usuário não autenticado')
  }

  return {
    userId: session.user.id,
    userHash: session.user.hash,
    userEmail: session.user.email,
    userName: session.user.name,
  }
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
