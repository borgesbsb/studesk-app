import React, { createContext, useContext, useState, ReactNode } from 'react'

export interface RenderedPage {
  pageNumber: number
  imageData: string
  width: number
  height: number
}

interface PdfRenderContextType {
  renderedPages: RenderedPage[]
  setRenderedPages: (pages: RenderedPage[]) => void
}

const PdfRenderContext = createContext<PdfRenderContextType | undefined>(undefined)

export function usePdfRender() {
  const ctx = useContext(PdfRenderContext)
  if (!ctx) throw new Error('usePdfRender deve ser usado dentro de PdfRenderProvider')
  return ctx
}

export function PdfRenderProvider({ children }: { children: ReactNode }) {
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([])
  return (
    <PdfRenderContext.Provider value={{ renderedPages, setRenderedPages }}>
      {children}
    </PdfRenderContext.Provider>
  )
} 