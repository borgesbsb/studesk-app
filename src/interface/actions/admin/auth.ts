'use server'

import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key-change-in-production'
)

export interface AdminSession {
  id: string
  email: string
  name: string
  role: string
}

export async function loginAdmin(email: string, password: string) {
  try {
    const admin = await prisma.admin.findUnique({
      where: { email }
    })

    if (!admin || !admin.active) {
      return { error: 'Credenciais inválidas' }
    }

    const passwordMatch = await bcrypt.compare(password, admin.password)

    if (!passwordMatch) {
      return { error: 'Credenciais inválidas' }
    }

    // Criar JWT token
    const token = await new SignJWT({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    // Salvar token no cookie
    const cookieStore = await cookies()
    cookieStore.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 dias
    })

    return {
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    }
  } catch (error) {
    console.error('Erro no login admin:', error)
    return { error: 'Erro ao fazer login' }
  }
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('admin-token')
  return { success: true }
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value

    if (!token) {
      return null
    }

    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as AdminSession
  } catch (error) {
    return null
  }
}

export async function createFirstAdmin() {
  try {
    // Verificar se já existe algum admin
    const adminCount = await prisma.admin.count()

    if (adminCount > 0) {
      return { error: 'Já existe um administrador cadastrado' }
    }

    // Criar primeiro admin com senha padrão
    const hashedPassword = await bcrypt.hash('admin123', 10)

    const admin = await prisma.admin.create({
      data: {
        email: 'admin@studesk.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'super_admin'
      }
    })

    return {
      success: true,
      message: 'Admin criado com sucesso',
      credentials: {
        email: 'admin@studesk.com',
        password: 'admin123'
      }
    }
  } catch (error) {
    console.error('Erro ao criar primeiro admin:', error)
    return { error: 'Erro ao criar administrador' }
  }
}
