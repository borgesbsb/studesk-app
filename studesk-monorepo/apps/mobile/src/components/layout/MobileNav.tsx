'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { cn } from '@studesk/ui/utils'

const navItems = [
  {
    name: 'Hoje',
    path: 'hoje',
    icon: (active: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-blue-600' : 'text-gray-400')}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
    ),
  },
  {
    name: 'Agenda',
    path: 'agenda',
    icon: (active: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-blue-600' : 'text-gray-400')}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    name: 'Disciplinas',
    path: 'disciplinas',
    icon: (active: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-blue-600' : 'text-gray-400')}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
    ),
  },
  {
    name: 'Plano',
    path: 'plano-estudos',
    icon: (active: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-blue-600' : 'text-gray-400')}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    name: 'Perfil',
    path: 'perfil',
    icon: (active: boolean) => (
      <svg
        className={cn('w-6 h-6', active ? 'text-blue-600' : 'text-gray-400')}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={active ? 0 : 2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    ),
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  // Tenta pegar o hash da sessão, senão pega da URL atual
  const sessionHash = (session?.user as any)?.hash || ''
  const pathHash = pathname.split('/')[1] || ''
  const userHash = sessionHash || pathHash

  // Se não houver hash disponível, não renderiza
  if (!userHash) {
    return null
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 48px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const href = `/${userHash}/${item.path}`
          const isActive = pathname.includes(`/${item.path}`)
          return (
            <Link
              key={item.path}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all active:scale-95',
                isActive ? 'text-blue-600' : 'text-gray-600'
              )}
            >
              {item.icon(isActive)}
              <span
                className={cn(
                  'text-xs font-medium',
                  isActive ? 'text-blue-600' : 'text-gray-600'
                )}
              >
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
