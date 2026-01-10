"use client"

import { cn } from "@/lib/utils"
import { useUserHash } from "@/contexts/user-hash-context"
import { SidebarContent } from "./SidebarContent"

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { hash } = useUserHash()

  return (
    <aside
      className={cn(
        // Desktop: sidebar fixa (mantém comportamento original)
        "hidden md:block",
        "fixed h-full z-30",
        "bg-background shadow-xl",
        "border-r",
        "transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-20"
      )}
    >
      <SidebarContent
        userHash={hash}
        isOpen={isOpen}
        setIsOpen={setIsOpen}
      />
    </aside>
  )
}