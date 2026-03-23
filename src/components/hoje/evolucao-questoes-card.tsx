"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { EvolucaoCiclo, getEvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { CicloInfo } from "@/interface/actions/dashboard/get-ciclos-plano";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

interface EvolucaoQuestoesCardProps {
  evolucao: EvolucaoCiclo | null;
  ciclosList: CicloInfo[];
  hoje: string;
}

function formatarIntervalo(dataInicio: Date, dataFim: Date): string {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const d1 = `${String(ini.getUTCDate()).padStart(2, '0')}/${String(ini.getUTCMonth() + 1).padStart(2, '0')}`;
  const d2 = `${String(fim.getUTCDate()).padStart(2, '0')}/${String(fim.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${d1}–${d2}`;
}

const DEPTH = 7;

function Bar3D({ x, y, width, height, frontColor, topColor, sideColor }: {
  x: number; y: number; width: number; height: number;
  frontColor: string; topColor: string; sideColor: string;
}) {
  if (height <= 0) return null;
  const d = DEPTH;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={frontColor} />
      <polygon points={`${x},${y} ${x + d},${y - d} ${x + width + d},${y - d} ${x + width},${y}`} fill={topColor} />
      <polygon points={`${x + width},${y} ${x + width + d},${y - d} ${x + width + d},${y + height - d} ${x + width},${y + height}`} fill={sideColor} />
    </g>
  );
}

function RealizadasShape(props: any) {
  const { x, y, width, height } = props;
  if (!height || height <= 0) return null;
  return <Bar3D x={x} y={y} width={width} height={height} frontColor="#22c55e" topColor="#86efac" sideColor="#15803d" />;
}

function PlanejadasShape(props: any) {
  const { x, y, width, height } = props;
  if (!height || height <= 0) return null;
  return <Bar3D x={x} y={y} width={width} height={height} frontColor="#ef4444" topColor="#fca5a5" sideColor="#b91c1c" />;
}

const chartConfig = {
  planejadas: { label: "Planejadas", color: "#ef4444" },
  realizadas: { label: "Realizadas", color: "#22c55e" },
} satisfies ChartConfig;

export function EvolucaoQuestoesCard({ evolucao: inicial, ciclosList, hoje }: EvolucaoQuestoesCardProps) {
  const hojeDate = new Date(hoje + 'T12:00:00Z');
  const cicloHoje = ciclosList.find(c => new Date(c.dataInicio) <= hojeDate && new Date(c.dataFim) >= hojeDate);
  const [selectedId, setSelectedId] = useState<string>(cicloHoje?.id ?? ciclosList[0]?.id ?? "");
  const [dados, setDados] = useState<EvolucaoCiclo | null>(inicial);
  const [loading, setLoading] = useState(false);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setLoading(true);
    const result = await getEvolucaoCiclo(hoje, id);
    setDados(result);
    setLoading(false);
  }

  if (!dados && !loading) {
    return (
      <Card className="h-full flex flex-col bg-card border-primary/15">
        <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
          <CardTitle className="flex items-center gap-2 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            Evolução de Questões
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Nenhum ciclo ativo</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = dados?.dias.map((dia, index) => ({
    dia: `Dia ${index + 1}`,
    realizadas: dia.questoesRealizadas,
    planejadas: dia.questoesPlanejadas,
  })) ?? [];

  return (
    <Card className="h-full flex flex-col bg-card border-primary/15">
      <CardHeader className="pb-1 pt-3 px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-xs font-semibold flex-shrink-0">Evolução de Questões</span>
          {ciclosList.length > 0 && (
            <Select value={selectedId} onValueChange={handleSelect}>
              <SelectTrigger className="h-6 text-[10px] px-2 ml-auto w-auto min-w-0 max-w-[160px] border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ciclosList.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    Ciclo {c.numeroSemana} · {formatarIntervalo(c.dataInicio, c.dataFim)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {dados && (
          <CardDescription className="text-[10px] mt-0.5">
            {new Date(dados.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - {new Date(dados.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3 px-3">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <BarChart data={chartData} margin={{ left: 12, right: 20, top: 16, bottom: 12 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="dia" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="planejadas" shape={<PlanejadasShape />} isAnimationActive={false} />
              <Bar dataKey="realizadas" shape={<RealizadasShape />} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
