import { Settings } from 'lucide-react'
import { getAdminSession } from '@/interface/actions/admin/auth'
import { prisma } from '@/lib/prisma'
import { GoogleDriveConfig } from '@/components/admin/configuracoes/google-drive-config'

export default async function ConfiguracoesPage() {
  const session = await getAdminSession()

  let driveConectado = false
  if (session) {
    const admin = await prisma.admin.findUnique({
      where: { id: session.id },
      select: { googleDriveAccessToken: true },
    })
    driveConectado = !!admin?.googleDriveAccessToken
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-slate-600" />
        <h1 className="text-2xl font-bold text-slate-800">Configurações</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Integrações</h2>
        <GoogleDriveConfig conectado={driveConectado} />
      </section>
    </div>
  )
}
