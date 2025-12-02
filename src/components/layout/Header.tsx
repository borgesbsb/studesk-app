"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { useSaveStatus } from "@/contexts/save-status-context"
import { useHeader } from "@/contexts/header-context"

interface HeaderProps {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
}

export function Header({ isOpen, setIsOpen }: HeaderProps) {
  const { status, message } = useSaveStatus()
  const { customContent, title, backButton } = useHeader()

  return (
    <header className="h-16 bg-background shadow-sm flex items-center px-6 sticky top-0 z-10 border-b">
      {/* Lado esquerdo: Menu e Botão Voltar */}
      <div className="flex items-center">
        {!isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="mr-4 hover:bg-accent rounded-full"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        {backButton}
      </div>

      {/* Centro: Título centralizado */}
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>

      {/* Direita: Conteúdo customizado ou status de salvamento */}
      <div className="flex items-center gap-4">
        {customContent ? (
          customContent
        ) : (
          status !== 'idle' && (
            <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
              status === 'saving' ? 'bg-blue-100 text-blue-700' :
              status === 'success' ? 'bg-green-100 text-green-700' :
              status === 'error' ? 'bg-red-100 text-red-700' : ''
            }`}>
              {message}
            </div>
          )
        )}
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
} 