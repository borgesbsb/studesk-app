"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

  // Preparar dados para o gráfico com valores acumulados
  let questoesPlanejadasAcum = 0;
  let questoesRealizadasAcum = 0;

  const chartData = evolucao.dias.map((dia, index) => {
    questoesPlanejadasAcum += dia.questoesPlanejadas;
    questoesRealizadasAcum += dia.questoesRealizadas;

    return {
      dia: `Dia ${index + 1}`,
      planejadas: questoesPlanejadasAcum,
      realizadas: questoesRealizadasAcum,
    };
  });

  const chartConfig = {
    planejadas: {
      label: "Planejadas",
      color: "hsl(var(--chart-3))",
    },
    realizadas: {
      label: "Realizadas",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-6 w-6" />
          Evolução de Questões - {evolucao.nomeCiclo}
        </CardTitle>
        <CardDescription>
          {new Date(evolucao.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(evolucao.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <AreaChart
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
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toString()}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="planejadas"
              type="basis"
              fill="var(--color-planejadas)"
              fillOpacity={0.4}
              stroke="var(--color-planejadas)"
              strokeWidth={2}
            />
            <Area
              dataKey="realizadas"
              type="basis"
              fill="var(--color-realizadas)"
              fillOpacity={0.4}
              stroke="var(--color-realizadas)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
