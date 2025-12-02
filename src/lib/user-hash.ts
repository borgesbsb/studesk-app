import { nanoid } from 'nanoid'
import { prisma } from '@/lib/prisma'

/**
 * Gera um hash único de 10 caracteres para identificar usuário
 * Formato: URL-safe, alfanumérico
 * Exemplo: "V1StGXR8_Z"
 */
export async function generateUniqueHash(): Promise<string> {
  let hash = nanoid(10)

  // Verificar unicidade (improvável colisão, mas garantir)
  let attempts = 0
  const maxAttempts = 10

  while (attempts < maxAttempts) {
    const existing = await prisma.user.findUnique({
      where: { hash },
      select: { id: true }
    })

    if (!existing) {
      return hash
    }

    // Colisão detectada, gerar novo hash
    hash = nanoid(10)
    attempts++
  }

  throw new Error('Falha ao gerar hash único após 10 tentativas')
}

/**
 * Valida formato do hash
 * Deve ter exatamente 10 caracteres URL-safe
 */
export function isValidHashFormat(hash: string): boolean {
  // 10 caracteres, URL-safe (alfanumérico + _ -)
  return /^[A-Za-z0-9_-]{10}$/.test(hash)
}

/**
 * Busca usuário por hash
 * Retorna dados básicos do usuário ou null se não encontrado
 */
export async function getUserByHash(hash: string) {
  if (!isValidHashFormat(hash)) {
    return null
  }

  try {
    const user = await prisma.user.findUnique({
      where: { hash },
      select: {
        id: true,
        hash: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      }
    })

    return user
  } catch (error) {
    console.error('Erro ao buscar usuário por hash:', error)
    return null
  }
}

/**
 * Verifica se um hash pertence a um usuário específico
 */
export async function verifyHashOwnership(hash: string, userId: string): Promise<boolean> {
  if (!isValidHashFormat(hash)) {
    return false
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        hash,
        id: userId
      },
      select: { id: true }
    })

    return user !== null
  } catch (error) {
    console.error('Erro ao verificar propriedade do hash:', error)
    return false
  }
}
