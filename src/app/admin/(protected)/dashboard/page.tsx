import { getAdminStats } from '@/interface/actions/admin/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, FileText, Calendar, TrendingUp } from 'lucide-react'

export default async function AdminDashboardPage() {
  const result = await getAdminStats()

  if (result.error || !result.stats) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar estatísticas</div>
      </div>
    )
  }

  const { stats } = result

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Disciplinas',
      value: stats.totalDisciplinas,
      icon: BookOpen,
      color: 'text-green-600'
    },
    {
      title: 'Materiais de Estudo',
      value: stats.totalMateriais,
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      title: 'Planos de Estudo',
      value: stats.totalPlanos,
      icon: Calendar,
      color: 'text-orange-600'
    },
    {
      title: 'Simulados',
      value: stats.totalSimulados,
      icon: TrendingUp,
      color: 'text-pink-600'
    },
    {
      title: 'Novos Usuários (30d)',
      value: stats.usersLast30Days,
      icon: Users,
      color: 'text-cyan-600'
    }
  ]

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usuários Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">{user.name || 'Sem nome'}</div>
                    <div className="text-sm text-slate-600">{user.email}</div>
                  </div>
                  <div className="text-sm text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividade de Leitura (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.usageByDay.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">
                    {new Date(day.date).toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${Math.max(day.count * 2, 10)}px` }} />
                    <span className="text-sm font-medium">{day.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
