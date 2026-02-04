import { getUsers } from '@/interface/actions/admin/users'
import { UsersTable } from '@/components/admin/users-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.search
  const page = parseInt(params.page || '1')

  const result = await getUsers(page, 20, search)

  if (result.error || !result.users) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar usuários</div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
        <p className="text-slate-600 mt-1">
          Visualize e gerencie todos os usuários do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários ({result.pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable
            initialUsers={result.users as any}
            initialTotal={result.pagination.total}
          />
        </CardContent>
      </Card>
    </div>
  )
}
