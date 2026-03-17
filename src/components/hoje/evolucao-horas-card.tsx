"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface EvolucaoHorasCardProps {
  evolucao: EvolucaoCiclo | null;
}

function formatMinutos(min: number): string {
  if (min <= 0) return '0min';
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

const DEPTH = 7; // profundidade do efeito 3D em px

function Bar3D({ x, y, width, height, frontColor, topColor, sideColor }: {
  x: number; y: number; width: number; height: number;
  frontColor: string; topColor: string; sideColor: string;
}) {
  if (height <= 0) return null;
  const d = DEPTH;
  return (
    <g>
      {/* Face frontal */}
      <rect x={x} y={y} width={width} height={height} fill={frontColor} />
      {/* Face superior */}
      <polygon
        points={`${x},${y} ${x + d},${y - d} ${x + width + d},${y - d} ${x + width},${y}`}
        fill={topColor}
      />
      {/* Face lateral direita */}
      <polygon
        points={`${x + width},${y} ${x + width + d},${y - d} ${x + width + d},${y + height - d} ${x + width},${y + height}`}
        fill={sideColor}
      />
    </g>
  );
}

function RealizadasShape(props: any) {
  const { x, y, width, height } = props;
  if (!height || height <= 0) return null;
  return (
    <Bar3D
      x={x} y={y} width={width} height={height}
      frontColor="#22c55e"
      topColor="#86efac"
      sideColor="#15803d"
    />
  );
}

function PlanejadasShape(props: any) {
  const { x, y, width, height } = props;
  if (!height || height <= 0) return null;
  return (
    <Bar3D
      x={x} y={y} width={width} height={height}
      frontColor="#ef4444"
      topColor="#fca5a5"
      sideColor="#b91c1c"
    />
  );
}

export function EvolucaoHorasCard({ evolucao }: EvolucaoHorasCardProps) {
  if (!evolucao) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-6 w-6" />
            Evolução de Horas
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
    realizadas: Math.round(dia.horasRealizadas * 60),
    planejadas: Math.round(dia.minutosPlanejados),
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
          <Clock className="h-3.5 w-3.5" />
          Evolução de Horas - {evolucao.nomeCiclo}
        </CardTitle>
        <CardDescription className="text-[10px]">
          {new Date(evolucao.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(evolucao.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-3 px-3">
        <ChartContainer config={chartConfig} className="h-full w-full">
          <BarChart
            data={chartData}
            margin={{ left: 12, right: 20, top: 16, bottom: 12 }}
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
              tickFormatter={(value) => formatMinutos(Number(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [formatMinutos(Number(value)), name]}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="planejadas" shape={<PlanejadasShape />} isAnimationActive={false} />
            <Bar dataKey="realizadas" shape={<RealizadasShape />} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
