'use client'

import { createContext, useContext, ReactNode } from 'react'

interface UserHashContextType {
  hash: string
  userId: string
}

const UserHashContext = createContext<UserHashContextType | null>(null)

export function UserHashProvider({
  children,
  hash,
  userId
}: {
  children: ReactNode
  hash: string
  userId: string
}) {
  return (
    <UserHashContext.Provider value={{ hash, userId }}>
      {children}
    </UserHashContext.Provider>
  )
}

export function useUserHash() {
  const context = useContext(UserHashContext)
  if (!context) {
    throw new Error('useUserHash must be used within UserHashProvider')
  }
  return context
}
