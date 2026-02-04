import { redirect } from 'next/navigation'
import { getAdminSession } from '@/interface/actions/admin/auth'

export default async function AdminRootPage() {
  const session = await getAdminSession()

  if (session) {
    redirect('/admin/dashboard')
  } else {
    redirect('/admin/login')
  }
}
