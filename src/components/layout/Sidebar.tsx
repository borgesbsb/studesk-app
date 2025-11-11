"use client"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Componentes de ícones inline para evitar problemas de HMR
const XIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const BookOpenIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.168 18.477 18.582 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

const GraduationCapIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
  </svg>
)

const LayoutDashboardIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={2} />
    <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={2} />
    <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={2} />
    <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={2} />
  </svg>
)

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth={2} />
    <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
    <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
    <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
  </svg>
)

const sidebarLinks = [
  { href: "/hoje", label: "Hoje", icon: LayoutDashboardIcon },
  { href: "/agenda", label: "Agenda", icon: CalendarIcon },
  { href: "/disciplinas", label: "Disciplinas", icon: BookOpenIcon },
  { href: "/plano-estudos", label: "Gerenciador de Estudos", icon: CalendarIcon },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (value: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <aside 
      className={cn(
        "fixed h-full z-30",
        "bg-background shadow-xl",
        "border-r",
        "transition-all duration-300 ease-in-out",
        isOpen ? "w-72" : "w-20"
      )}
    >
      <div className={cn(
        "h-16",
        "flex items-center",
        "border-b",
        "transition-all duration-300",
        isOpen ? "px-6 justify-between" : "px-4 justify-center"
      )}>
        <div className={cn("flex items-center gap-3", !isOpen && "flex-1 justify-center")}>
          <div className={cn(
            "flex items-center justify-center",
            "rounded-lg bg-gradient-to-r from-blue-600 to-purple-600",
            "transition-all duration-300",
            isOpen ? "w-8 h-8" : "w-12 h-12"
          )}>
            <GraduationCapIcon className={cn(
              "text-white",
              "transition-all duration-300",
              isOpen ? "w-5 h-5" : "w-6 h-6"
            )} />
          </div>
          <h1 className={cn(
            "font-bold text-xl",
            "transition-all duration-300",
            "overflow-hidden whitespace-nowrap",
            isOpen ? "opacity-100 w-auto" : "opacity-0 w-0"
          )}>
            Studesk
          </h1>
        </div>
        {isOpen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="hover:bg-accent rounded-full ml-2"
          >
            <XIcon />
          </Button>
        )}
      </div>

      <Separator />

      <nav className={cn("p-4", isOpen ? "px-4" : "px-2")}>
        {sidebarLinks.map(({ href, label, icon: Icon }) => (
          <Tooltip key={href} delayDuration={0}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3",
                  "py-3 px-4",
                  "hover:bg-accent",
                  "rounded-lg mb-2",
                  "group",
                  "transition-all duration-200 ease-in-out",
                  !isOpen && "justify-center px-2"
                )}
              >
                <Icon className={cn(
                  "text-muted-foreground group-hover:text-foreground",
                  "transition-colors",
                  isOpen ? "h-5 w-5" : "h-6 w-6"
                )} />
                {isOpen && (
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {label}
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent side="right" className="border-none">
                {label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>

      <div className={cn(
        "absolute bottom-0 w-full",
        "border-t",
        "transition-all duration-300",
        isOpen ? "p-6" : "p-4"
      )}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              className={cn(
                "transition-all",
                isOpen ? "w-full" : "w-12 h-12 rounded-full"
              )}
            >
              {isOpen ? (
                "Sair"
              ) : (
                <LogOutIcon className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent side="right" className="border-none">
              Sair
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  )
}