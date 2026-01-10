import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { getUserByHash } from '@/lib/user-hash'
import { UserHashProvider } from '@/contexts/user-hash-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { ReactNode } from 'react'

export default async function UserHashLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ userHash: string }>
}) {
  const session = await getServerSession(authOptions)

  // Redirecionar se não autenticado
  if (!session) {
    redirect('/login')
  }

  // Aguardar params antes de usar (Next.js 15+)
  const { userHash } = await params

  // Validar se hash existe e pertence ao usuário logado
  const user = await getUserByHash(userHash)

  if (!user || user.id !== session.user.id) {
    // Hash inválido ou tentativa de acessar dados de outro usuário
    redirect(`/${session.user.hash}/hoje`)
  }

  return (
    <UserHashProvider hash={userHash} userId={user.id}>
      <AppLayout>{children}</AppLayout>
    </UserHashProvider>
  )
}
