"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface HeaderContextType {
  customContent: ReactNode
  setCustomContent: (content: ReactNode) => void
  title: string
  setTitle: (title: string) => void
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined)

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [customContent, setCustomContent] = useState<ReactNode>(null)
  const [title, setTitle] = useState("Dashboard")

  return (
    <HeaderContext.Provider value={{ customContent, setCustomContent, title, setTitle }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader() {
  const context = useContext(HeaderContext)
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider")
  }
  return context
}
