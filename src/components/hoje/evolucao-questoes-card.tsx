"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface EvolucaoQuestoesCardProps {
  evolucao: EvolucaoCiclo | null;
}

export function EvolucaoQuestoesCard({ evolucao }: EvolucaoQuestoesCardProps) {
  if (!evolucao) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-6 w-6" />
            Evolução de Questões
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum ciclo ativo</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = evolucao.dias.map((dia, index) => ({
    dia: `Dia ${index + 1}`,
    realizadas: dia.questoesRealizadas,
    planejadas: dia.questoesPlanejadas,
  }));

  const chartConfig = {
    planejadas: {
      label: "Planejadas",
      color: "#ef4444",
    },
    realizadas: {
      label: "Realizadas",
      color: "#22c55e",
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full flex flex-col bg-card border-primary/15">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-2 text-xs">
          <ClipboardList className="h-3.5 w-3.5" />
          Evolução de Questões - {evolucao.nomeCiclo}
        </CardTitle>
        <CardDescription className="text-[10px]">
          {new Date(evolucao.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(evolucao.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3 px-3">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="planejadas"
              fill="var(--color-planejadas)"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="realizadas"
              fill="var(--color-realizadas)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
