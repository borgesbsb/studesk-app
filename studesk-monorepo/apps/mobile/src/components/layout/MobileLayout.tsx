'use client'

import { MobileHeader } from './MobileHeader'
import { MobileNav } from './MobileNav'
import { ReactNode } from 'react'

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showHeader?: boolean
  showNav?: boolean
  showBack?: boolean
  onBack?: () => void
}

export function MobileLayout({
  children,
  title,
  showHeader = true,
  showNav = true,
  showBack = false,
  onBack,
}: MobileLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {showHeader && <MobileHeader title={title} showBack={showBack} onBack={onBack} />}

      <main className="flex-1 overflow-y-auto pb-safe">
        <div className={showNav ? 'pb-16' : ''}>{children}</div>
      </main>

      {showNav && <MobileNav />}
    </div>
  )
}
