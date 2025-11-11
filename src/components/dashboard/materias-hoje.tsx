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
              <div className="space-y-3 pr-2">
              {materias.map((materia) => {
                const cardClasses = materia.concluida 
                  ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                  : "bg-background border-border";
                  
                return (
                  <div 
                    key={materia.id}
                    className={`p-3 rounded-lg border transition-all hover:shadow-sm ${cardClasses}`}
                  >
                      {/* Header simplificado */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h4 className="font-semibold text-base text-foreground truncate">
                            {materia.disciplinaNome}
                          </h4>
                          {materia.concluida && (
                            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                        
                        {/* Apenas badge no canto superior direito */}
                        <Badge 
                          variant={materia.prioridade === 1 ? "destructive" : materia.prioridade === 2 ? "default" : "secondary"}
                          className="text-xs flex-shrink-0"
                        >
                          {materia.prioridade === 1 ? "Alta" : materia.prioridade === 2 ? "Média" : "Baixa"}
                        </Badge>
                      </div>
                      
                      {/* Material nome compacto */}
                      {materia.materialNome && (
                        <p className="text-xs text-muted-foreground mb-2 truncate">
                          📄 {materia.materialNome}
                        </p>
                      )}

                      {/* Assuntos a estudar */}
                      {materia.observacoes && (
                        <div className="mb-3 p-3 bg-primary/10 border border-primary/20 rounded-md">
                          <p className="text-xs font-semibold text-primary mb-2">📝 Assuntos:</p>
                          <p className="text-sm text-foreground font-medium leading-relaxed">{materia.observacoes}</p>
                        </div>
                      )}

                      {/* Progresso compacto */}
                      <div className="space-y-2">
                        {/* Tempo */}
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Tempo
                            </span>
                            <span className="font-medium text-foreground">
                              {formatarTempo(materia.tempoRealEstudo)} / {formatarTempo(materia.horasPlanejadas)}
                            </span>
                          </div>
                          <Progress 
                            value={calcularProgressoHoras(materia.tempoRealEstudo, materia.horasPlanejadas)}
                            className="h-2"
                          />
                        </div>

                        {/* Questões */}
                        {materia.questoesPlanejadas > 0 && (
                          <div>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                Questões
                              </span>
                              <span className="font-medium text-foreground">
                                {materia.questoesRealizadas} / {materia.questoesPlanejadas}
                              </span>
                            </div>
                            <Progress 
                              value={calcularProgressoQuestoes(materia.questoesRealizadas, materia.questoesPlanejadas)}
                              className="h-2"
                            />
                          </div>
                        )}

                        {/* Botões centralizados embaixo das barras */}
                        <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t">
                          <Link 
                            href={`/disciplina/${materia.disciplinaId}/materiais`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded hover:bg-accent transition-colors"
                            title="Ver materiais da disciplina"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </Link>
                          <AdicionarTempoModal
                            disciplinaNome={materia.disciplinaNome}
                            onAdicionarTempo={(minutos) => handleAdicionarTempo(materia.disciplinaId, minutos)}
                          />
                          {materia.tempoSessoesPdf > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleTransferirTempo(materia.disciplinaId);
                              }}
                              className="h-8 text-xs"
                              title="Transferir tempo das sessões PDF para Tempo Real de Estudo"
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Transferir PDF
                            </Button>
                          )}
                        </div>
                      </div>
                  </div>
                );
              })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}