"use client"

import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SaveStatusProvider } from "@/contexts/save-status-context"
import { HeaderProvider } from "@/contexts/header-context"

export function AppLayout({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <SaveStatusProvider>
      <HeaderProvider>
        <TooltipProvider delayDuration={0}>
          <div className="min-h-screen flex">
            <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

            <div className={cn(
              "flex-1",
              "transition-all duration-300",
              isOpen ? "ml-72" : "ml-20"
            )}>
              <Header isOpen={isOpen} setIsOpen={setIsOpen} />

              <main className="p-6 bg-background/95 min-h-[calc(100vh-4rem)]">
                {children}
              </main>
            </div>
          </div>
        </TooltipProvider>
      </HeaderProvider>
    </SaveStatusProvider>
  )
} 