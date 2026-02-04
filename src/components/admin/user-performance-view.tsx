'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Clock,
  FileText,
  Target,
  TrendingUp,
  CheckCircle2,
  XCircle,
  User
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

interface UserPerformanceViewProps {
  data: any
}

export function UserPerformanceView({ data }: UserPerformanceViewProps) {
  const { user, leitura, questoes } = data

  return (
    <div className="space-y-6">
      {/* Informações do Usuário */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900">
                {user.name || 'Sem nome'}
              </h2>
              <p className="text-slate-600">{user.email}</p>
              <p className="text-sm text-slate-500 mt-1">
                Cadastrado em {formatDate(user.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="text-xs">
                Hash: {user.hash}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="leitura" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leitura">Leitura</TabsTrigger>
          <TabsTrigger value="questoes">Questões</TabsTrigger>
          <TabsTrigger value="simulados">Simulados</TabsTrigger>
          <TabsTrigger value="ciclo">Ciclo Atual</TabsTrigger>
        </TabsList>

        {/* ABA DE LEITURA */}
        <TabsContent value="leitura" className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Tempo Total
                </CardTitle>
                <Clock className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatTime(leitura.tempoTotalSegundos)}
                </div>
                <p className="text-xs text-slate-500">
                  {leitura.totalSessoes} sessões
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Páginas Lidas
                </CardTitle>
                <FileText className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leitura.totalPaginasLidas}</div>
                <p className="text-xs text-slate-500">Total acumulado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Em Progresso
                </CardTitle>
                <BookOpen className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leitura.materiaisEmProgresso}</div>
                <p className="text-xs text-slate-500">Materiais</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Concluídos
                </CardTitle>
                <CheckCircle2 className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{leitura.materiaisConcluidos}</div>
                <p className="text-xs text-slate-500">Materiais</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Evolução */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Leitura (Últimos 30 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leitura.leiturasPorDia.slice(-14).map((day: any) => (
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
                          style={{
                            width: `${Math.min(
                              (day.sessoes / Math.max(...leitura.leiturasPorDia.map((d: any) => d.sessoes), 1)) * 100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-medium w-24 text-right">
                      {day.sessoes} sessões
                    </div>
                    <div className="text-xs text-slate-500 w-16 text-right">
                      {formatTime(day.tempoSegundos)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materiais */}
          <Card>
            <CardHeader>
              <CardTitle>Materiais ({leitura.materiais.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leitura.materiais.slice(0, 10).map((material: any) => {
                  const progresso = (material.paginasLidas / material.totalPaginas) * 100
                  return (
                    <div key={material.id} className="border-b pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{material.nome}</div>
                          <div className="text-xs text-slate-500">
                            {material.tipo} • {material._count.historicoLeitura} sessões
                          </div>
                        </div>
                        <div className="text-sm font-medium">
                          {material.paginasLidas}/{material.totalPaginas}
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA DE QUESTÕES */}
        <TabsContent value="questoes" className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Simulados
                </CardTitle>
                <FileText className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{questoes.totalSimulados}</div>
                <p className="text-xs text-slate-500">
                  {questoes.simuladosFinalizados} finalizados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Questões
                </CardTitle>
                <Target className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{questoes.totalQuestoes}</div>
                <p className="text-xs text-slate-500">Respondidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Taxa de Acerto
                </CardTitle>
                <TrendingUp className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {questoes.taxaAcertoGeral.toFixed(1)}%
                </div>
                <p className="text-xs text-slate-500">
                  {questoes.questoesCorretas} corretas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  Erros
                </CardTitle>
                <XCircle className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {questoes.totalQuestoes - questoes.questoesCorretas}
                </div>
                <p className="text-xs text-slate-500">
                  {(100 - questoes.taxaAcertoGeral).toFixed(1)}% erro
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance por Disciplina */}
          <Card>
            <CardHeader>
              <CardTitle>Performance por Disciplina</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {questoes.performancePorDisciplina.map((disc: any) => (
                  <div key={disc.disciplinaId} className="border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{disc.disciplinaNome}</div>
                      <div className="text-sm font-medium">
                        {disc.percentualAcerto.toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600 rounded-full transition-all"
                          style={{ width: `${disc.percentualAcerto}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-500">
                        {disc.questoesCorretas}/{disc.totalQuestoes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Evolução da Taxa de Acerto */}
          {questoes.evolucaoTaxaAcerto.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Evolução da Taxa de Acerto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {questoes.evolucaoTaxaAcerto.map((evo: any) => (
                    <div key={evo.ordem} className="flex items-center justify-between">
                      <div className="text-sm text-slate-600 w-32">
                        Simulado #{evo.ordem}
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="h-6 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-600 rounded-full transition-all"
                            style={{ width: `${evo.nota}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-sm font-medium w-20 text-right">
                        {evo.nota.toFixed(1)}%
                      </div>
                      <div className="text-xs text-slate-500 w-24 text-right">
                        {formatDate(evo.data)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA DE SIMULADOS */}
        <TabsContent value="simulados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Simulados ({questoes.simulados.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {questoes.simulados.map((simulado: any) => (
                  <div key={simulado.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium text-lg">{simulado.nome}</div>
                        <div className="text-sm text-slate-600">
                          {formatDate(simulado.dataRealizacao)} •{' '}
                          {simulado.tempoTotalSegundos ? formatTime(simulado.tempoTotalSegundos) : 'N/A'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {simulado.notaGeral.toFixed(1)}%
                        </div>
                        <div className="text-sm text-slate-600">
                          {simulado.questoesCorretas}/{simulado.questoesTotal}
                        </div>
                      </div>
                    </div>

                    {/* Disciplinas do Simulado */}
                    <div className="space-y-2 mt-4">
                      {simulado.disciplinas.map((disc: any) => (
                        <div key={disc.disciplinaId} className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              disc.status === 'verde'
                                ? 'bg-green-500'
                                : disc.status === 'amarelo'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                          />
                          <div className="flex-1 text-sm">{disc.disciplinaNome}</div>
                          <div className="text-sm font-medium">
                            {disc.nota.toFixed(1)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            ({disc.questoesCorretas}/{disc.questoesTotal})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA CICLO ATUAL */}
        <TabsContent value="ciclo" className="space-y-6">
          {data.evolucaoCiclo ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {data.evolucaoCiclo.nomeCiclo}
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    {formatDate(data.evolucaoCiclo.dataInicio)} até {formatDate(data.evolucaoCiclo.dataFim)}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gráfico de Horas */}
                    <div>
                      <h3 className="font-medium mb-4">Evolução de Horas</h3>
                      <div className="space-y-2">
                        {data.evolucaoCiclo.dias.map((dia: any) => (
                          <div key={dia.dia} className="flex items-center justify-between">
                            <div className="text-sm text-slate-600 w-16">
                              {dia.dia}
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="relative h-8">
                                {/* Barra de planejado */}
                                <div className="absolute inset-0 bg-slate-100 rounded-full" />
                                {/* Barra de realizado */}
                                <div
                                  className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min((dia.horasRealizadas / Math.max(dia.horasPlanejadas, 1)) * 100, 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-sm font-medium w-32 text-right">
                              {dia.horasRealizadas.toFixed(1)}h / {dia.horasPlanejadas.toFixed(1)}h
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gráfico de Questões */}
                    <div>
                      <h3 className="font-medium mb-4">Evolução de Questões</h3>
                      <div className="space-y-2">
                        {data.evolucaoCiclo.dias.map((dia: any) => (
                          <div key={dia.dia} className="flex items-center justify-between">
                            <div className="text-sm text-slate-600 w-16">
                              {dia.dia}
                            </div>
                            <div className="flex-1 mx-4">
                              <div className="relative h-8">
                                {/* Barra de planejado */}
                                <div className="absolute inset-0 bg-slate-100 rounded-full" />
                                {/* Barra de realizado */}
                                <div
                                  className="absolute inset-y-0 left-0 bg-green-600 rounded-full transition-all"
                                  style={{
                                    width: `${Math.min((dia.questoesRealizadas / Math.max(dia.questoesPlanejadas, 1)) * 100, 100)}%`
                                  }}
                                />
                              </div>
                            </div>
                            <div className="text-sm font-medium w-32 text-right">
                              {dia.questoesRealizadas} / {dia.questoesPlanejadas}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo do Ciclo */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Horas Totais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.horasRealizadas, 0).toFixed(1)}h
                    </div>
                    <p className="text-xs text-slate-500">
                      de {data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.horasPlanejadas, 0).toFixed(1)}h planejadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      Questões Totais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.questoesRealizadas, 0)}
                    </div>
                    <p className="text-xs text-slate-500">
                      de {data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.questoesPlanejadas, 0)} planejadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      % Horas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalPlanejadas = data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.horasPlanejadas, 0)
                        const totalRealizadas = data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.horasRealizadas, 0)
                        return totalPlanejadas > 0 ? ((totalRealizadas / totalPlanejadas) * 100).toFixed(1) : '0'
                      })()}%
                    </div>
                    <p className="text-xs text-slate-500">Cumprimento</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      % Questões
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(() => {
                        const totalPlanejadas = data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.questoesPlanejadas, 0)
                        const totalRealizadas = data.evolucaoCiclo.dias.reduce((acc: number, dia: any) => acc + dia.questoesRealizadas, 0)
                        return totalPlanejadas > 0 ? ((totalRealizadas / totalPlanejadas) * 100).toFixed(1) : '0'
                      })()}%
                    </div>
                    <p className="text-xs text-slate-500">Cumprimento</p>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600">Nenhum ciclo ativo encontrado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
