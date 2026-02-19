"use client"

import { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SaveStatusProvider } from "@/contexts/save-status-context"
import { HeaderProvider, useHeader } from "@/contexts/header-context"
import { CronometroProvider } from "@/contexts/cronometro-context"
import { CronometroModal } from "@/components/hoje/cronometro-modal"
import { CronometroFlutuante } from "@/components/hoje/cronometro-flutuante"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SidebarContent } from "./SidebarContent"
import { useUserHash } from "@/contexts/user-hash-context"

function AppLayoutContent({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { fullWidth } = useHeader()
  const { hash } = useUserHash()

  return (
    <div className="h-screen md:min-h-screen flex overflow-hidden md:overflow-visible">
      {/* Desktop: Sidebar fixa */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Mobile: Drawer */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-72" style={{ backgroundColor: 'var(--sidebar-panel-bg)' }}>
          <SidebarContent
            userHash={hash}
            isOpen={true}
            isMobile={true}
            onLinkClick={() => setIsMobileMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className={cn(
        "flex-1 flex flex-col",
        "transition-all duration-300",
        "h-screen md:min-h-screen",
        // Desktop: aplica margin-left
        // Mobile: sem margin (sidebar está escondida)
        isOpen ? "md:ml-72" : "md:ml-20"
      )}>
        <Header
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        <main className={cn(
          "bg-background",
          "flex-1 overflow-y-auto",
          "p-0"
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
        <CronometroProvider>
          <TooltipProvider delayDuration={0}>
            <AppLayoutContent>{children}</AppLayoutContent>
            <CronometroModal />
            <CronometroFlutuante />
          </TooltipProvider>
        </CronometroProvider>
      </HeaderProvider>
    </SaveStatusProvider>
  )
} 