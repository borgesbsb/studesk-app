import { requireAdminAuth } from '@/lib/admin-auth'
import { AdminSidebar } from '@/components/admin/admin-sidebar'

export default async function AdminProtectedLayout({
  children
}: {
  children: React.ReactNode
}) {
  await requireAdminAuth()

  return (
    <div className="flex h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
