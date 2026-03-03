"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Timer, ClipboardList, ExternalLink, TrendingUp, Play, List, FileText } from "lucide-react";
import { MateriaDoDia } from "@/interface/actions/dashboard/materias-do-dia";
import { AdicionarTempoModal } from "./adicionar-tempo-modal";
import { AdicionarQuestoesModal } from "./adicionar-questoes-modal";
import { adicionarTempoManual } from "@/interface/actions/dashboard/adicionar-tempo-manual";
import { useCronometro } from "@/contexts/cronometro-context";
import { adicionarQuestoes } from "@/interface/actions/dashboard/adicionar-questoes";
import { useDashboard } from "@/contexts/dashboard-context";
import { useSaveStatus } from "@/contexts/save-status-context";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserHash } from "@/contexts/user-hash-context";
import { useState, useEffect } from "react";
import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MateriasHojeCardStyleProps {
  materias: MateriaDoDia[];
  onTempoAdicionado?: () => void;
}

interface MateriasState {
  [key: string]: MateriaDoDia;
}

export function MateriasHojeCardStyle({ materias, onTempoAdicionado }: MateriasHojeCardStyleProps) {
  const { hash } = useUserHash();
  const router = useRouter();
  const { selectedDate, triggerRefresh } = useDashboard();
  const { setSuccess, setError } = useSaveStatus();

  // Estado local otimista para as matérias
  const [materiasState, setMateriasState] = useState<MateriasState>(() => {
    const initial: MateriasState = {};
    materias.forEach(m => {
      initial[m.disciplinaId] = m;
    });
    return initial;
  });

  const [modalTempoAberto, setModalTempoAberto] = useState(false);
  const [modalQuestoesAberto, setModalQuestoesAberto] = useState(false);
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<MateriaDoDia | null>(null);
  const { iniciar: iniciarCronometro } = useCronometro();

  // Sincronizar estado local quando props mudam
  useEffect(() => {
    const newState: MateriasState = {};
    materias.forEach(m => {
      newState[m.disciplinaId] = m;
    });
    setMateriasState(newState);
  }, [materias]);

  // Atualizar quando cronômetro salvar tempo
  useEffect(() => {
    const handler = () => {
      triggerRefresh();
      onTempoAdicionado?.();
    };
    window.addEventListener('cronometro-saved', handler);
    return () => window.removeEventListener('cronometro-saved', handler);
  }, [triggerRefresh, onTempoAdicionado]);

  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />')
    return { __html: html }
  }

  const calcularProgressoHoras = (realizadas: number, planejadas: number) => {
    if (planejadas === 0) return 0;
    return Math.min((realizadas / planejadas) * 100, 100);
  };

  const formatarTempo = (horas: number) => {
    if (horas < 1) {
      const minutos = Math.round(horas * 60);
      return `${minutos}min`;
    }
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas - horasInt) * 60);
    if (minutos === 0) return `${horasInt}h`;
    return `${horasInt}h${minutos}m`;
  };

  const getCorProgresso = (progresso: number) => {
    // Gradiente de vermelho (0%) até azul (100%)
    if (progresso >= 90) return "hsl(217, 91%, 60%)"; // Azul forte
    if (progresso >= 75) return "hsl(200, 91%, 60%)"; // Azul médio
    if (progresso >= 60) return "hsl(180, 70%, 50%)"; // Ciano
    if (progresso >= 45) return "hsl(160, 70%, 50%)"; // Verde-azulado
    if (progresso >= 30) return "hsl(45, 93%, 47%)";  // Amarelo
    if (progresso >= 15) return "hsl(25, 95%, 53%)";  // Laranja
    return "hsl(0, 84%, 60%)"; // Vermelho
  };

  const renderRadialChart = (progresso: number, icone: React.ReactNode, label: string, titulo: string) => {
    const porcentagem = Math.min(Math.round(progresso), 100);
    const cor = getCorProgresso(progresso);

    // Dados normalizados para 0-100
    const chartData = [
      {
        progress: porcentagem,
        fill: cor,
      }
    ];

    const chartConfig = {
      progress: {
        label: titulo,
        color: cor,
      },
    } satisfies ChartConfig;

    return (
      <div className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer">
        {/* Título */}
        <div className="flex items-center gap-1.5">
          {icone}
          <span className="text-xs font-semibold">{titulo}</span>
        </div>

        {/* Radial Chart */}
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[140px] pointer-events-none"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={(porcentagem / 100) * 360}
            innerRadius={50}
            outerRadius={70}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[54, 46]}
            />
            <RadialBar
              dataKey="progress"
              background
              cornerRadius={10}
              fill={cor}
            />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 5}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {porcentagem}%
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 15}
                          className="fill-muted-foreground text-xs"
                        >
                          {titulo}
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>

        {/* Label inferior */}
        <div className="text-center -mt-1 pointer-events-none">
          <div className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</div>
        </div>
      </div>
    );
  };

  const renderRadialChartOnly = (progresso: number, titulo: string) => {
    const porcentagem = Math.min(Math.round(progresso), 100);
    const cor = getCorProgresso(progresso);

    const chartConfig = {
      progress: { label: titulo, color: cor },
    } satisfies ChartConfig;

    return (
      <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square w-full max-w-[140px] pointer-events-none"
      >
        <RadialBarChart
          data={[{ progress: porcentagem, fill: cor }]}
          startAngle={0}
          endAngle={(porcentagem / 100) * 360}
          innerRadius={50}
          outerRadius={70}
        >
          <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[54, 46]} />
          <RadialBar dataKey="progress" background cornerRadius={10} fill={cor} />
          <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
            <Label
              content={({ viewBox }) => {
                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                  return (
                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) - 5} className="fill-foreground text-3xl font-bold">{porcentagem}%</tspan>
                      <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 15} className="fill-muted-foreground text-xs">{titulo}</tspan>
                    </text>
                  );
                }
              }}
            />
          </PolarRadiusAxis>
        </RadialBarChart>
      </ChartContainer>
    );
  };

  const handleAbrirTempo = (materia: MateriaDoDia) => {
    setDisciplinaSelecionada(materia);
    setModalTempoAberto(true);
  };

  const handleAbrirCronometro = (materia: MateriaDoDia) => {
    iniciarCronometro(materia.disciplinaId, materia.disciplinaNome);
  };

  const handleAdicionarQuestoes = (materia: MateriaDoDia) => {
    setDisciplinaSelecionada(materia);
    setModalQuestoesAberto(true);
  };

  const handleSalvarTempo = async (totalMinutos: number) => {
    if (!disciplinaSelecionada) return;

    const disciplinaId = disciplinaSelecionada.disciplinaId;
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const horasAdicionadas = totalMinutos / 60;

    // Fechar modal imediatamente
    setModalTempoAberto(false);
    setDisciplinaSelecionada(null);

    // Atualização otimista - atualizar UI imediatamente
    setMateriasState(prev => {
      const materia = prev[disciplinaId];
      if (!materia) return prev;

      return {
        ...prev,
        [disciplinaId]: {
          ...materia,
          horasRealizadas: materia.horasRealizadas + horasAdicionadas,
          tempoRealEstudo: materia.tempoRealEstudo + horasAdicionadas,
        }
      };
    });

    try {
      const result = await adicionarTempoManual({
        disciplinaId,
        horas,
        minutos,
        data: selectedDate,
      });

      if (result.success) {
        setSuccess("Tempo adicionado com sucesso!");
        // Atualizar gráficos
        triggerRefresh();
      } else {
        setError(result.message || "Erro ao adicionar tempo");
        // Reverter em caso de erro
        onTempoAdicionado?.();
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar tempo:', error);
      setError("Erro ao adicionar tempo");
      // Reverter em caso de erro
      onTempoAdicionado?.();
    }
  };

  const handleSalvarQuestoes = async (quantidade: number) => {
    if (!disciplinaSelecionada) return;

    const disciplinaId = disciplinaSelecionada.disciplinaId;

    // Fechar modal imediatamente
    setModalQuestoesAberto(false);
    setDisciplinaSelecionada(null);

    // Atualização otimista - atualizar UI imediatamente
    setMateriasState(prev => {
      const materia = prev[disciplinaId];
      if (!materia) return prev;

      return {
        ...prev,
        [disciplinaId]: {
          ...materia,
          questoesRealizadas: materia.questoesRealizadas + quantidade,
        }
      };
    });

    try {
      const result = await adicionarQuestoes({
        disciplinaId,
        quantidade,
        data: selectedDate,
      });

      if (result.success) {
        setSuccess(`${quantidade} questões adicionadas!`);
        // Atualizar gráficos
        triggerRefresh();
      } else {
        setError(result.message || "Erro ao adicionar questões");
        // Reverter em caso de erro
        onTempoAdicionado?.();
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar questões:', error);
      setError("Erro ao adicionar questões");
      // Reverter em caso de erro
      onTempoAdicionado?.();
    }
  };

  if (materias.length === 0) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Matérias para Estudar
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onTempoAdicionado}
              className="h-9"
            >
              🔄 Atualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-base">Nenhuma matéria programada para hoje</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col border-0">
        <CardHeader className="flex-shrink-0 pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6" />
              Matérias para Estudar
            </div>
           </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
          {Object.values(materiasState)
            .sort((a, b) => a.prioridade - b.prioridade)
            .map((materia) => {
            const progressoTempo = calcularProgressoHoras(materia.horasRealizadas, materia.horasPlanejadas);
            const progressoQuestoes = materia.questoesPlanejadas > 0
              ? Math.min((materia.questoesRealizadas / materia.questoesPlanejadas) * 100, 100)
              : 0;

            return (
              <div
                key={materia.id}
                className="flex flex-col gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Nome da Disciplina + Link Material */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-1.5 h-6 rounded-full"
                      style={{ backgroundColor: materia.disciplinaCor || "#3b82f6" }}
                    />
                    <h3 className="font-semibold text-base">{materia.disciplinaNome}</h3>
                  </div>
                  {materia.materialNome && (
                    <Link
                      href={`/${hash}/disciplina/${materia.disciplinaId}/materiais`}
                      className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 ml-3.5"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      {materia.materialNome}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>

                {/* Radial Charts */}
                <div className={`grid gap-4 ${materia.assuntos ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {/* Card Tempo com ações */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
                    {/* Coluna esquerda: label + gráfico */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Timer className="h-4 w-4" />
                        <span className="text-xs font-semibold">Tempo</span>
                      </div>
                      {renderRadialChartOnly(progressoTempo, "Tempo")}
                      <div className="text-[10px] font-medium text-muted-foreground -mt-1">
                        {formatarTempo(materia.horasRealizadas)} / {formatarTempo(materia.horasPlanejadas)}
                      </div>
                    </div>
                    {/* Coluna direita: botões */}
                    <div className="flex flex-col gap-2 justify-start">
                      {/* Botões de tempo - lado a lado no topo */}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirTempo(materia);
                          }}
                          className="flex-1 h-auto py-1.5 px-1 text-[10px]"
                        >
                          <Timer className="h-3 w-3 mr-0.5" />
                          Tempo
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAbrirCronometro(materia);
                          }}
                          className="flex-1 h-auto py-1.5 px-1 text-[10px]"
                        >
                          <Play className="h-3 w-3 mr-0.5" />
                          Crono
                        </Button>
                      </div>
                      {/* Materiais abaixo */}
                      {materia.materiaisAdmin?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {materia.materiaisAdmin.map(mat => (
                            <button
                              key={mat.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const path = mat.tipo === 'VIDEO'
                                  ? `/${hash}/material/${mat.id}/video`
                                  : `/${hash}/material/${mat.id}/ler?mode=pdf`;
                                router.push(path);
                              }}
                              className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] font-medium hover:bg-accent transition-colors text-left w-full overflow-hidden"
                            >
                              {/* Barra de progresso de fundo */}
                              {(() => {
                                const progresso = mat.tipo === 'VIDEO'
                                  ? (mat.duracaoSegundos && mat.duracaoSegundos > 0 ? Math.min((mat.tempoAssistido ?? 0) / mat.duracaoSegundos * 100, 100) : 0)
                                  : (mat.totalPaginas > 0 ? Math.min(mat.paginasLidas / mat.totalPaginas * 100, 100) : 0);
                                return progresso > 0 ? (
                                  <span
                                    className="absolute inset-y-0 left-0 pointer-events-none bg-primary"
                                    style={{ width: `${progresso}%`, opacity: 0.2 }}
                                  />
                                ) : null;
                              })()}
                              {mat.tipo === 'VIDEO'
                                ? <Play className="h-3 w-3 shrink-0 text-blue-500 relative z-10" />
                                : <FileText className="h-3 w-3 shrink-0 text-red-500 relative z-10" />}
                              <span className="truncate relative z-10">{mat.nome}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/${hash}/disciplina/${materia.disciplinaId}/materiais`);
                          }}
                          className="w-full h-auto py-1.5 px-2 text-[10px]"
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Estudar
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Card Assuntos */}
                  {materia.assuntos && (
                    <div className="p-3 rounded-lg border bg-card flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        <List className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold">Assuntos</span>
                      </div>
                      <div
                        className="text-xs text-muted-foreground leading-relaxed overflow-y-auto max-h-[120px]"
                        dangerouslySetInnerHTML={renderMarkdown(materia.assuntos)}
                      />
                    </div>
                  )}

                  {/* Card Questões com ação */}
                  {materia.questoesPlanejadas > 0 && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-card">
                      {/* Coluna esquerda: label + gráfico */}
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardList className="h-4 w-4" />
                          <span className="text-xs font-semibold">Questões</span>
                        </div>
                        {renderRadialChartOnly(progressoQuestoes, "Questões")}
                        <div className="text-[10px] font-medium text-muted-foreground -mt-1">
                          {materia.questoesRealizadas} / {materia.questoesPlanejadas}
                        </div>
                      </div>
                      {/* Coluna direita: botão */}
                      <div className="flex flex-col gap-2 justify-center">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAdicionarQuestoes(materia);
                          }}
                          className="w-full h-auto py-1.5 px-2 text-[10px]"
                        >
                          <ClipboardList className="h-3 w-3 mr-1" />
                          Add Questões
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Modais */}
      {disciplinaSelecionada && (
        <>
          <AdicionarTempoModal
            isOpen={modalTempoAberto}
            onClose={() => {
              setModalTempoAberto(false);
              setDisciplinaSelecionada(null);
            }}
            onSave={handleSalvarTempo}
            disciplinaNome={disciplinaSelecionada.disciplinaNome}
            disciplinaId={disciplinaSelecionada.disciplinaId}
          />

          <AdicionarQuestoesModal
            isOpen={modalQuestoesAberto}
            onClose={() => {
              setModalQuestoesAberto(false);
              setDisciplinaSelecionada(null);
            }}
            onSave={handleSalvarQuestoes}
            disciplinaNome={disciplinaSelecionada.disciplinaNome}
          />

        </>
      )}
    </>
  );
}
