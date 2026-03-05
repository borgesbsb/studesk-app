"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer, ClipboardList, TrendingUp } from "lucide-react";
import { ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo";
import { Label, PolarAngleAxis, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";
import { ChartConfig, ChartContainer } from "@/components/ui/chart";

interface ProgressoCicloCardProps {
  progresso: ProgressoCiclo | null;
}

export function ProgressoCicloCard({ progresso }: ProgressoCicloCardProps) {
  if (!progresso) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-6 w-6" />
            Progresso do Ciclo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum ciclo ativo</p>
        </CardContent>
      </Card>
    );
  }

  const progressoHoras = progresso.minutosPlanejados > 0
    ? Math.min((progresso.horasRealizadas * 60 / progresso.minutosPlanejados) * 100, 100)
    : 0;

  const progressoQuestoes = progresso.questoesPlanejadas > 0
    ? Math.min((progresso.questoesRealizadas / progresso.questoesPlanejadas) * 100, 100)
    : 0;

  const getCorProgresso = (progresso: number) => {
    if (progresso >= 90) return "hsl(217, 91%, 60%)"; // Azul forte
    if (progresso >= 75) return "hsl(200, 91%, 60%)"; // Azul médio
    if (progresso >= 60) return "hsl(180, 70%, 50%)"; // Ciano
    if (progresso >= 45) return "hsl(160, 70%, 50%)"; // Verde-azulado
    if (progresso >= 30) return "hsl(45, 93%, 47%)";  // Amarelo
    if (progresso >= 15) return "hsl(25, 95%, 53%)";  // Laranja
    return "hsl(0, 84%, 60%)"; // Vermelho
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

  // Dados para cada camada - IMPORTANTE: cada camada precisa ter seu próprio range
  const chartData = [
    {
      name: "Horas",
      horas: Math.round(progressoHoras),
      fill: getCorProgresso(progressoHoras),
    },
    {
      name: "Questões",
      questoes: Math.round(progressoQuestoes),
      fill: getCorProgresso(progressoQuestoes),
    },
  ];

  const chartConfig = {
    horas: {
      label: "Horas",
      color: getCorProgresso(progressoHoras),
    },
    questoes: {
      label: "Questões",
      color: getCorProgresso(progressoQuestoes),
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-6 w-6" />
          {progresso.nomeCiclo}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {new Date(progresso.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(progresso.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center gap-2 pb-2">
        {/* Radial Chart com Camadas - Usando posicionamento absoluto para sobrepor */}
        <div className="relative w-full max-w-[720px] aspect-square">
          {/* Camada Externa - Horas */}
          <div className="absolute inset-0">
            <ChartContainer
              config={chartConfig}
              className="w-full h-full"
            >
              <RadialBarChart
                data={[{ value: Math.round(progressoHoras), fill: getCorProgresso(progressoHoras) }]}
                startAngle={90}
                endAngle={90 + (Math.round(progressoHoras) / 100) * 360}
                innerRadius={200}
                outerRadius={320}
              >
                <PolarGrid
                  gridType="circle"
                  radialLines={false}
                  stroke="none"
                  className="first:fill-muted last:fill-background"
                  polarRadius={[210, 190]}
                />
                <RadialBar
                  dataKey="value"
                  background={{ fill: 'hsl(var(--muted))' }}
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ChartContainer>
          </div>

          {/* Camada Interna - Questões */}
          <div className="absolute inset-0">
            <ChartContainer
              config={chartConfig}
              className="w-full h-full"
            >
              <RadialBarChart
                data={[{ value: Math.round(progressoQuestoes), fill: getCorProgresso(progressoQuestoes) }]}
                startAngle={90}
                endAngle={90 + (Math.round(progressoQuestoes) / 100) * 360}
                innerRadius={120}
                outerRadius={180}
              >
                <PolarGrid
                  gridType="circle"
                  radialLines={false}
                  stroke="none"
                  className="first:fill-muted last:fill-background"
                  polarRadius={[130, 110]}
                />
                <RadialBar
                  dataKey="value"
                  background={{ fill: 'hsl(var(--muted))' }}
                  cornerRadius={10}
                />
              </RadialBarChart>
            </ChartContainer>
          </div>

          {/* Label Central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold">Progresso</p>
            <p className="text-xl text-muted-foreground">do Ciclo</p>
          </div>
        </div>

        {/* Legendas */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          {/* Horas */}
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4" style={{ color: getCorProgresso(progressoHoras) }} />
              <span className="text-sm font-semibold">Horas</span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: getCorProgresso(progressoHoras) }}>
                {Math.round(progressoHoras)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {formatarTempo(progresso.horasRealizadas)} / {formatarTempo(progresso.minutosPlanejados / 60)}
              </p>
            </div>
          </div>

          {/* Questões */}
          <div className="flex flex-col items-center gap-2 p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" style={{ color: getCorProgresso(progressoQuestoes) }} />
              <span className="text-sm font-semibold">Questões</span>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: getCorProgresso(progressoQuestoes) }}>
                {Math.round(progressoQuestoes)}%
              </p>
              <p className="text-xs text-muted-foreground">
                {progresso.questoesRealizadas} / {progresso.questoesPlanejadas}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
