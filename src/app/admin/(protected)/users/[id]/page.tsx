import { getUserDetails } from '@/interface/actions/admin/users'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserDetailsPage({ params }: PageProps) {
  const { id } = await params
  const result = await getUserDetails(id)

  if (result.error || !result.user) {
    return (
      <div className="p-8">
        <div className="text-red-600">Erro ao carregar detalhes do usuário</div>
      </div>
    )
  }

  const { user } = result

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {user.name || 'Sem nome'}
          </h1>
          <p className="text-slate-600 mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-slate-600">Email</div>
              <div className="mt-1">{user.email}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Nome</div>
              <div className="mt-1">{user.name || 'Não informado'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Hash</div>
              <div className="mt-1">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {user.hash}
                </code>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">ID</div>
              <div className="mt-1">
                <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                  {user.id}
                </code>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Cadastrado em</div>
              <div className="mt-1">
                {new Date(user.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-slate-600">Última atualização</div>
              <div className="mt-1">
                {new Date(user.updatedAt).toLocaleString('pt-BR')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Uso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-bold">D</span>
                </div>
                <div>
                  <div className="font-medium">Disciplinas</div>
                  <div className="text-sm text-slate-600">Total criadas</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg">
                {user._count.disciplinas}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-bold">M</span>
                </div>
                <div>
                  <div className="font-medium">Materiais de Estudo</div>
                  <div className="text-sm text-slate-600">PDFs e vídeos</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg">
                {user._count.materiaisEstudo}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-600 font-bold">P</span>
                </div>
                <div>
                  <div className="font-medium">Planos de Estudo</div>
                  <div className="text-sm text-slate-600">Planos criados</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg">
                {user._count.planosEstudo}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-bold">S</span>
                </div>
                <div>
                  <div className="font-medium">Simulados</div>
                  <div className="text-sm text-slate-600">Realizados</div>
                </div>
              </div>
              <Badge variant="secondary" className="text-lg">
                {user._count.resultadosSimulado}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
        </CardHeader>
        <CardContent>
          {user.googleDriveAccessToken ? (
            <div className="space-y-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Conectado
              </Badge>
              <div className="text-sm text-slate-600">
                {user.googleDriveTokenExpiry && (
                  <div>
                    Expira em: {new Date(user.googleDriveTokenExpiry).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
              Não conectado
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
