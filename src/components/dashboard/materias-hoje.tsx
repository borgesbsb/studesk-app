"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen, CheckCircle, ExternalLink, ArrowRight, Plus } from "lucide-react";
import { MateriaDoDia } from "@/interface/actions/dashboard/materias-do-dia";
import { AdicionarTempoModal } from "./adicionar-tempo-modal";
import { adicionarTempoManual } from "@/interface/actions/dashboard/adicionar-tempo-manual";
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

  const calcularProgressoQuestoes = (realizadas: number, planejadas: number) => {
    if (planejadas === 0) return 0;
    return Math.min((realizadas / planejadas) * 100, 100);
  };

  const handleAdicionarTempo = async (disciplinaId: string, horas: number, minutos: number) => {
    try {
      console.log(`Adicionando ${horas}h ${minutos}min para disciplina ${disciplinaId} na data ${selectedDate.toISOString()}`);
      
      const resultado = await adicionarTempoManual(disciplinaId, horas, minutos, selectedDate);
      
      if (resultado.success) {
        console.log('✅ Tempo adicionado com sucesso:', resultado.message);
        setSuccess(resultado.message);
        if (onTempoAdicionado) {
          onTempoAdicionado();
        }
      } else {
        console.error('❌ Erro ao adicionar tempo:', resultado.message);
        setError(resultado.message);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      setError('Erro inesperado ao adicionar tempo');
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Matérias para Estudar
        </CardTitle>
      </CardHeader>
      <CardContent>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                    {totalHorasReais}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {totalHorasPlanejadas}h planejadas
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-sm font-medium">Progresso</p>
                  <p className="text-2xl font-bold">
                    {materias.length > 0 ? Math.round((materiasCompletas / materias.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {materias.map((materia) => {
                const cardClasses = materia.concluida 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-background border-border";
                  
                return (
                  <div 
                    key={materia.id}
                    className={`p-4 rounded-lg border transition-all ${cardClasses}`}
                  >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">
                              {materia.disciplinaNome}
                            </h4>
                            {materia.concluida && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                            <Link 
                              href={`/disciplina/${materia.disciplinaId}/materiais`}
                              className="ml-auto"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                            </Link>
                          </div>
                          {materia.materialNome && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {materia.materialNome}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <AdicionarTempoModal
                            disciplinaNome={materia.disciplinaNome}
                            onAdicionarTempo={(horas, minutos) => handleAdicionarTempo(materia.disciplinaId, horas, minutos)}
                          />
                          <Badge variant={materia.prioridade === 1 ? "destructive" : materia.prioridade === 2 ? "default" : "secondary"}>
                            {materia.prioridade === 1 ? "Alta" : materia.prioridade === 2 ? "Média" : "Baixa"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              Tempo Real de Estudo
                            </span>
                            <span>{materia.tempoRealEstudo}h de {materia.horasPlanejadas}h</span>
                          </div>
                          <Progress 
                            value={calcularProgressoHoras(materia.tempoRealEstudo, materia.horasPlanejadas)}
                            className="h-2"
                          />
                        </div>

                        {materia.tempoSessoesPdf > 0 && (
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTransferirTempo(materia.disciplinaId);
                              }}
                              className="h-6 px-2 text-xs hover:bg-primary/10"
                              title="Transferir tempo das sessões PDF para Tempo Real de Estudo"
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Transferir Sessões PDF ({materia.tempoSessoesPdf}h)
                            </Button>
                          </div>
                        )}

                        {materia.questoesPlanejadas > 0 && (
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                Questões
                              </span>
                              <span>{materia.questoesRealizadas} / {materia.questoesPlanejadas}</span>
                            </div>
                            <Progress 
                              value={calcularProgressoQuestoes(materia.questoesRealizadas, materia.questoesPlanejadas)}
                              className="h-2"
                            />
                          </div>
                        )}
                      </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}