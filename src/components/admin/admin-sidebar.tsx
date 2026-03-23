'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  BarChart3,
  LogOut,
  Settings,
  ClipboardList,
  CalendarDays
} from 'lucide-react'
import { logoutAdmin } from '@/interface/actions/admin/auth'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Estatísticas',
    href: '/admin/estatisticas',
    icon: BarChart3
  },
  {
    title: 'Usuários',
    href: '/admin/users',
    icon: Users
  },
  {
    title: 'Planos de Estudo',
    href: '/admin/plano-estudos',
    icon: CalendarDays
  },
  {
    title: 'Disciplinas',
    href: '/admin/disciplinas',
    icon: BookOpen
  },
  {
    title: 'Editais',
    href: '/admin/editais',
    icon: FileText
  },
  {
    title: 'Materiais',
    href: '/admin/materiais',
    icon: FileText
  },
  {
    title: 'Simulados',
    href: '/admin/simulados',
    icon: ClipboardList
  },
  {
    title: 'Configurações',
    href: '/admin/settings',
    icon: Settings
  }
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await logoutAdmin()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full w-60" style={{ background: '#1a1714' }}>
      {/* Branding */}
      <div className="px-5 py-5 border-b" style={{ borderColor: '#2c2825' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">Studesk</p>
            <p className="text-xs leading-tight" style={{ color: '#a09890' }}>Admin</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-orange-500/15 text-orange-400 font-medium'
                  : 'font-normal hover:bg-white/5'
              )}
              style={!isActive ? { color: '#a09890' } : undefined}
            >
              <Icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-orange-400' : '')} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: '#2c2825' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
          style={{ color: '#a09890' }}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}
