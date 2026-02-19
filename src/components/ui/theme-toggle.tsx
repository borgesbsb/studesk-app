"use client"

import * as React from "react"
import { Moon, Sun, Palette } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themes = [
  { name: "light", label: "Claro", icon: Sun },
  { name: "dark", label: "Escuro", icon: Moon },
  { name: "navy", label: "Navy", icon: Palette },
]

function NavyPreview() {
  return (
    <span className="ml-auto flex items-center gap-0.5">
      <span className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: '#111a41' }} />
      <span className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: '#fcfdfd' }} />
    </span>
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        style={{ color: 'var(--header-foreground)' }}
        disabled
      >
        <Sun className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Carregando tema</span>
      </Button>
    )
  }

  const CurrentIcon = theme === "dark" ? Moon : theme === "navy" ? Palette : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          style={{ color: 'var(--header-foreground)' }}
          title="Selecionar tema"
        >
          <CurrentIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Selecionar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {themes.map(({ name, label, icon: Icon }) => (
          <DropdownMenuItem
            key={name}
            onClick={() => setTheme(name)}
            className={`cursor-pointer ${theme === name ? "bg-accent" : ""}`}
          >
            <Icon className="mr-2 h-4 w-4 shrink-0" />
            <span>{label}</span>
            {name === "navy" && <NavyPreview />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
