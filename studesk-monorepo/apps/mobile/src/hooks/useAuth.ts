'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
}

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await signIn('credentials', {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou senha inválidos')
        return false
      }

      router.push('/dashboard')
      return true
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (data: RegisterData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Chama API local para registrar
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        setError(error.message || 'Erro ao criar conta')
        return false
      }

      // Após registrar, faz login automaticamente
      return await login({
        email: data.email,
        password: data.password,
      })
    } catch (err) {
      setError('Erro ao criar conta. Tente novamente.')
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading' || isLoading,
    error,
    login,
    register,
    logout,
    clearError: () => setError(null),
  }
}
