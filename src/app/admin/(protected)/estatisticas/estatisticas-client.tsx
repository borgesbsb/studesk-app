'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Clock, FileText, Target, TrendingUp, Users, CheckCircle2, XCircle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserSearch } from '@/components/admin/user-search'
import { UserPerformanceView } from '@/components/admin/user-performance-view'
import { getUserPerformance } from '@/interface/actions/admin/user-performance'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}

interface EstatisticasClientProps {
  reading: any
  questions: any
}

export function EstatisticasClient({ reading, questions }: EstatisticasClientProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleSelectUser = async (userId: string) => {
    setLoading(true)
    setSelectedUserId(userId)

    const result = await getUserPerformance(userId)
    if (result.success && result.data) {
      setUserData(result.data)
    }
    setLoading(false)
  }

  return (
      <Tabs defaultValue="leitura" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leitura">Leitura</TabsTrigger>
          <TabsTrigger value="questoes">Questões</TabsTrigger>
          <TabsTrigger value="usuario">Por Usuário</TabsTrigger>
        </TabsList>

        <TabsContent value="leitura" className="space-y-6">
          {/* Cards de Resumo - Leitura */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Sessões
                </CardTitle>
                <BookOpen className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reading.totalHistoricoLeitura}</div>
                <p className="text-xs text-slate-500 mt-1">Registros de leitura</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Tempo Total
                </CardTitle>
                <Clock className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatTime(reading.totalTempoLeituraSegundos)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {reading.totalTempoLeituraSegundos.toLocaleString()} segundos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Páginas Lidas
                </CardTitle>
                <FileText className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reading.totalPaginasLidas}</div>
                <p className="text-xs text-slate-500 mt-1">Total acumulado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Materiais Ativos
                </CardTitle>
                <Users className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reading.usuariosAtivos}</div>
                <p className="text-xs text-slate-500 mt-1">Com leituras</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Leituras por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade de Leitura (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reading.leiturasPorDia.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 w-24">
                      {new Date(day.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${Math.min((day.count / Math.max(...reading.leiturasPorDia.map(d => d.count))) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium w-32 text-right">
                      {day.count} sessões
                    </div>
                    <div className="text-xs text-slate-500 w-20 text-right">
                      {formatTime(day.tempoTotalSegundos)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Usuários */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Usuários por Tempo de Leitura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reading.topUsuarios.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.userName || 'Sem nome'}</div>
                      <div className="text-sm text-slate-600">{user.userEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatTime(user.totalTempoSegundos)}</div>
                      <div className="text-xs text-slate-500">{user.totalSessoes} sessões</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materiais Mais Lidos */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Materiais Mais Lidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reading.materiaisMaisLidos.map((material, index) => (
                  <div key={material.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{material.nome}</div>
                        <div className="text-xs text-slate-500">{material.tipo}</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">
                      {material._count.historicoLeitura} leituras
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questoes" className="space-y-6">
          {/* Cards de Resumo - Questões */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Simulados
                </CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{questions.totalSimulados}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {questions.usuariosComSimulados} usuários
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total de Questões
                </CardTitle>
                <Target className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{questions.totalQuestoes}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {questions.totalQuestoesRespondidas} respondidas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Taxa de Acerto
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{questions.percentualAcertoGeral}%</div>
                <p className="text-xs text-slate-500 mt-1">
                  {questions.totalQuestoesCorretas} de {questions.totalQuestoesRespondidas}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Usuários Ativos
                </CardTitle>
                <Users className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{questions.usuariosComSimulados}</div>
                <p className="text-xs text-slate-500 mt-1">Com simulados</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Simulados por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade de Simulados (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questions.simuladosPorDia.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 w-24">
                      {new Date(day.date).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit'
                      })}
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 rounded-full transition-all"
                          style={{ width: `${Math.min((day.simulados / Math.max(...questions.simuladosPorDia.map(d => d.simulados), 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium w-32 text-right">
                      {day.simulados} simulados
                    </div>
                    <div className="text-xs text-slate-500 w-32 text-right">
                      {day.questoesRespondidas} questões
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance por Usuário */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Usuários por Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questions.performancePorUsuario.map((user, index) => (
                  <div key={user.userId} className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.userName || 'Sem nome'}</div>
                      <div className="text-sm text-slate-600">{user.userEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-lg">{user.percentualAcerto}%</div>
                      <div className="text-xs text-slate-500">
                        {user.totalCorretas}/{user.totalQuestoes} questões
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">
                        {user.totalSimulados} simulados
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disciplinas Mais Praticadas */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Disciplinas Mais Praticadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questions.disciplinasMaisPraticadas.map((disciplina, index) => (
                  <div key={disciplina.disciplinaId} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="font-medium">{disciplina.nome}</div>
                    </div>
                    <div className="text-sm font-medium">
                      {disciplina.count} simulados
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA POR USUÁRIO */}
        <TabsContent value="usuario" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <UserSearch onSelectUser={handleSelectUser} />
            </CardContent>
          </Card>

          {loading && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-slate-600">Carregando dados do usuário...</div>
              </CardContent>
            </Card>
          )}

          {!loading && !userData && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <div className="text-slate-600">
                  Busque e selecione um usuário para ver suas estatísticas detalhadas
                </div>
              </CardContent>
            </Card>
          )}

          {!loading && userData && (
            <UserPerformanceView data={userData} />
          )}
        </TabsContent>
      </Tabs>
  )
}
