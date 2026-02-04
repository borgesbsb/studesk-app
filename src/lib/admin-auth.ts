import { redirect } from 'next/navigation'
import { getAdminSession } from '@/interface/actions/admin/auth'

export async function requireAdminAuth() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return session
}
