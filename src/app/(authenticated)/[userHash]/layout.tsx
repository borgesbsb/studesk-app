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
  params: { userHash: string }
}) {
  const session = await getServerSession(authOptions)

  // Redirecionar se não autenticado
  if (!session) {
    redirect('/login')
  }

  // Validar se hash existe e pertence ao usuário logado
  const user = await getUserByHash(params.userHash)

  if (!user || user.id !== session.user.id) {
    // Hash inválido ou tentativa de acessar dados de outro usuário
    redirect(`/${session.user.hash}/hoje`)
  }

  return (
    <UserHashProvider hash={params.userHash} userId={user.id}>
      <AppLayout>{children}</AppLayout>
    </UserHashProvider>
  )
}
