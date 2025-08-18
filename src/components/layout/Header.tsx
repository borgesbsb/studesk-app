"use client"

import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

interface HeaderProps {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
}

export function Header({ isOpen, setIsOpen }: HeaderProps) {
  return (
    <header className="h-16 bg-background shadow-sm flex items-center px-6 sticky top-0 z-10 border-b">
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
      <h1 className="text-xl font-semibold flex-1">Dashboard</h1>
      <ThemeToggle />
    </header>
  )
} 