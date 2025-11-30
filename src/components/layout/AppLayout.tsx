"use client"

import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SaveStatusProvider } from "@/contexts/save-status-context"
import { HeaderProvider, useHeader } from "@/contexts/header-context"

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const { fullWidth } = useHeader()

  return (
    <div className="min-h-screen flex">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className={cn(
        "flex-1",
        "transition-all duration-300",
        isOpen ? "ml-72" : "ml-20"
      )}>
        <Header isOpen={isOpen} setIsOpen={setIsOpen} />

        <main className={cn(
          "bg-background/95",
          fullWidth ? "h-[calc(100vh-4rem)] relative" : "min-h-[calc(100vh-4rem)] p-6"
        )}>
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SaveStatusProvider>
      <HeaderProvider>
        <TooltipProvider delayDuration={0}>
          <AppLayoutContent>{children}</AppLayoutContent>
        </TooltipProvider>
      </HeaderProvider>
    </SaveStatusProvider>
  )
} 