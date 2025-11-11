"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, BookOpen, CheckCircle, FolderOpen, ArrowRightCircle, Timer, ClipboardList, Plus } from "lucide-react";
import { MateriaDoDia } from "@/interface/actions/dashboard/materias-do-dia";
import { AdicionarTempoModal } from "./adicionar-tempo-modal";
import { AdicionarQuestoesModal } from "./adicionar-questoes-modal";
import { adicionarTempoManual } from "@/interface/actions/dashboard/adicionar-tempo-manual";
import { adicionarQuestoes } from "@/interface/actions/dashboard/adicionar-questoes";
import { transferirTempoSessoes } from "@/interface/actions/dashboard/transferir-tempo-sessoes";
import { useDashboard } from "@/contexts/dashboard-context";
import { useSaveStatus } from "@/contexts/save-status-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface MateriasHojeProps {
  materias: MateriaDoDia[];
  onTempoAdicionado?: () => void;
}

export function MateriasHoje({ materias, onTempoAdicionado }: MateriasHojeProps) {
  const { selectedDate } = useDashboard();
  const { setSuccess, setError } = useSaveStatus();
  const router = useRouter();
  
  const calcularProgressoHoras = (realizadas: number, planejadas: number) => {
    if (planejadas === 0) return 0;
    return Math.min((realizadas / planejadas) * 100, 100);
  };

  const formatarTempo = (horas: number) => {
    if (horas < 1) {
      const minutos = Math.round(horas * 60);
      return `${minutos}m`;
    }
    return `${horas}h`;
  };

  const calcularProgressoQuestoes = (realizadas: number, planejadas: number) => {
    if (planejadas === 0) return 0;
    return Math.min((realizadas / planejadas) * 100, 100);
  };

  const getPizzaEmoji = (progresso: number) => {
    if (progresso === 0) return "○"; // 0%
    if (progresso < 25) return "◔"; // 1-25%
    if (progresso < 50) return "◑"; // 25-50%
    if (progresso < 75) return "◕"; // 50-75%
    return "●"; // 75%+
  };

  const handleAdicionarTempo = async (disciplinaId: string, minutos: number) => {
    try {
      console.log(`🕒 [INICIO] Adicionando ${minutos} minutos para disciplina ${disciplinaId} na data ${selectedDate.toISOString()}`);
      
      const resultado = await adicionarTempoManual(disciplinaId, minutos, selectedDate);
      
      console.log('🕒 [RESULTADO]', resultado);
      
      if (resultado.success) {
        console.log('✅ [SUCCESS] Tempo adicionado com sucesso:', resultado.message);
        setSuccess(resultado.message);
        if (onTempoAdicionado) {
          console.log('🔄 [REFRESH] Chamando callback onTempoAdicionado');
          await onTempoAdicionado();
          console.log('✅ [REFRESH] Callback executado com sucesso');
        }
      } else {
        console.error('❌ [ERROR] Erro ao adicionar tempo:', resultado.message);
        setError(resultado.message);
      }
    } catch (error) {
      console.error('❌ [EXCEPTION] Erro inesperado:', error);
      setError('Erro inesperado ao adicionar tempo');
    }
  };


  const handleAdicionarQuestoes = async (disciplinaId: string, quantidade: number) => {
    try {
      console.log(`📝 [INICIO] Adicionando ${quantidade} questões para disciplina ${disciplinaId} na data ${selectedDate.toISOString()}`);

      const resultado = await adicionarQuestoes(disciplinaId, quantidade, selectedDate);

      console.log('📝 [RESULTADO]', resultado);

      if (resultado.success) {
        console.log('✅ [SUCCESS] Questões adicionadas com sucesso:', resultado.message);
        setSuccess(resultado.message);
        if (onTempoAdicionado) {
          console.log('🔄 [REFRESH] Chamando callback onTempoAdicionado');
          await onTempoAdicionado();
          console.log('✅ [REFRESH] Callback executado com sucesso');
        }
      } else {
        console.error('❌ [ERROR] Erro ao adicionar questões:', resultado.message);
        setError(resultado.message);
      }
    } catch (error) {
      console.error('❌ [EXCEPTION] Erro inesperado:', error);
      setError('Erro inesperado ao adicionar questões');
    }
  };

  const handleTransferirTempo = async (disciplinaId: string) => {
    try {
      console.log(`Transferindo tempo das sessões PDF para disciplina ${disciplinaId} na data ${selectedDate.toISOString()}`);

      const resultado = await transferirTempoSessoes(disciplinaId, selectedDate);

      if (resultado.success) {
        console.log('✅ Tempo transferido com sucesso:', resultado.message);
        setSuccess(resultado.message);
        if (onTempoAdicionado) {
          onTempoAdicionado();
        }
      } else {
        console.error('❌ Erro ao transferir tempo:', resultado.message);
        setError(resultado.message);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setError('Erro inesperado ao transferir tempo');
    }
  };

  const totalHorasPlanejadas = materias.reduce((acc, materia) => acc + materia.horasPlanejadas, 0);
  const totalHorasReais = materias.reduce((acc, materia) => acc + materia.tempoRealEstudo, 0);
  const materiasCompletas = materias.filter(materia => materia.concluida).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Matérias para Estudar
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {materias.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-4 rounded-full bg-muted/20">
              <BookOpen className="h-12 w-12 text-muted-foreground/60" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">Nenhuma matéria programada</h3>
              <p className="text-muted-foreground text-sm">Crie um ciclo de estudos para organizar seu aprendizado</p>
            </div>
            <Button 
              onClick={() => router.push('/plano-estudos')}
              className="flex items-center gap-2 px-6 py-2 h-10"
              size="default"
            >
              <Plus className="h-4 w-4" />
              Adicionar ciclo de estudos
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-shrink-0">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <BookOpen className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Matérias</p>
                  <p className="text-2xl font-bold">
                    {materiasCompletas}/{materias.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Horas Estudadas</p>
                  <p className="text-2xl font-bold">
                    {formatarTempo(totalHorasReais)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {formatarTempo(totalHorasPlanejadas)} planejadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Progresso</p>
                  <p className="text-2xl font-bold">
                    {totalHorasPlanejadas > 0 ? Math.round((totalHorasReais / totalHorasPlanejadas) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px]">Disciplina</TableHead>
                      <TableHead className="w-[200px]">Assuntos</TableHead>
                      <TableHead className="w-[140px] text-center">Tempo</TableHead>
                      <TableHead className="w-[140px] text-center">Questões</TableHead>
                      <TableHead className="w-[120px] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materias.map((materia) => {
                      const progressoTempo = calcularProgressoHoras(materia.tempoRealEstudo, materia.horasPlanejadas);
                      const progressoQuestoes = calcularProgressoQuestoes(materia.questoesRealizadas, materia.questoesPlanejadas);
                      const rowClasses = materia.concluida
                        ? "bg-green-50 dark:bg-green-950/20"
                        : "";

                      return (
                        <TableRow key={materia.id} className={rowClasses}>
                          {/* Disciplina */}
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {materia.concluida && (
                                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                                )}
                                <span className="font-semibold text-sm">
                                  {materia.disciplinaNome}
                                </span>
                              </div>
                              <Badge
                                variant={materia.prioridade === 1 ? "destructive" : materia.prioridade === 2 ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {materia.prioridade === 1 ? "Alta" : materia.prioridade === 2 ? "Média" : "Baixa"}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* Assuntos */}
                          <TableCell>
                            <div className="text-xs text-muted-foreground">
                              {materia.observacoes || (
                                <span className="italic">Sem assuntos definidos</span>
                              )}
                            </div>
                          </TableCell>

                          {/* Tempo com Pizza */}
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{getPizzaEmoji(progressoTempo)}</span>
                                <span className="text-sm font-medium">{Math.round(progressoTempo)}%</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatarTempo(materia.tempoRealEstudo)} / {formatarTempo(materia.horasPlanejadas)}
                              </div>
                            </div>
                          </TableCell>

                          {/* Questões com Pizza */}
                          <TableCell className="text-center">
                            {materia.questoesPlanejadas > 0 ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl">{getPizzaEmoji(progressoQuestoes)}</span>
                                  <span className="text-sm font-medium">{Math.round(progressoQuestoes)}%</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {materia.questoesRealizadas} / {materia.questoesPlanejadas}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">N/A</span>
                            )}
                          </TableCell>

                          {/* Ações */}
                          <TableCell>
                            <div className="flex items-center justify-center gap-1.5">
                              <Link
                                href={`/disciplina/${materia.disciplinaId}/materiais`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-md hover:bg-primary/10 transition-colors group"
                                title="📂 Abrir materiais"
                              >
                                <FolderOpen className="h-4 w-4 text-primary group-hover:text-primary/80" />
                              </Link>
                              <AdicionarTempoModal
                                disciplinaNome={materia.disciplinaNome}
                                onAdicionarTempo={(minutos) => handleAdicionarTempo(materia.disciplinaId, minutos)}
                              />
                              {materia.questoesPlanejadas > 0 && (
                                <AdicionarQuestoesModal
                                  disciplinaNome={materia.disciplinaNome}
                                  onAdicionarQuestoes={(quantidade) => handleAdicionarQuestoes(materia.disciplinaId, quantidade)}
                                />
                              )}
                              {materia.tempoSessoesPdf > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleTransferirTempo(materia.disciplinaId);
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-purple-50 hover:border-purple-400 dark:hover:bg-purple-950/20"
                                  title="🔄 Transferir tempo das sessões PDF"
                                >
                                  <ArrowRightCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Legenda das Pizzas */}
              <div className="mt-3 p-2 bg-muted/30 rounded-md">
                <p className="text-xs text-muted-foreground text-center">
                  <span className="font-medium">Legenda:</span>
                  {" "}● = 75%+{" · "}
                  ◕ = 50-75%{" · "}
                  ◑ = 25-50%{" · "}
                  ◔ = 1-25%{" · "}
                  ○ = 0%
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}