"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Target } from "lucide-react";
import { CicloPlanejado, getCicloPlanejado } from "@/interface/actions/dashboard/get-ciclo-planejado";
import { CicloInfo } from "@/interface/actions/dashboard/get-ciclos-plano";

interface CicloPlanejadoCardProps {
  cicloPlanejado: CicloPlanejado | null;
  ciclosList: CicloInfo[];
  hoje: string;
}

function formatarTempo(minutos: number): string {
  if (minutos <= 0) return "0min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function formatarDia(data: Date): string {
  const d = new Date(data);
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const diaSemana = dias[d.getUTCDay()];
  const dia = String(d.getUTCDate()).padStart(2, '0');
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${diaSemana}, ${dia}/${mes}`;
}

function formatarIntervalo(dataInicio: Date, dataFim: Date): string {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const d1 = `${String(ini.getUTCDate()).padStart(2, '0')}/${String(ini.getUTCMonth() + 1).padStart(2, '0')}`;
  const d2 = `${String(fim.getUTCDate()).padStart(2, '0')}/${String(fim.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${d1}–${d2}`;
}

function CicloGrid({ cicloPlanejado }: { cicloPlanejado: CicloPlanejado | null }) {
  if (!cicloPlanejado) {
    return <p className="text-muted-foreground text-sm">Nenhum ciclo ativo</p>;
  }

  const diasComDiscs = cicloPlanejado.dias.filter(d => d.disciplinas.length > 0);

  if (diasComDiscs.length === 0) {
    return <p className="text-muted-foreground text-sm">Nenhuma disciplina planejada</p>;
  }

  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${diasComDiscs.length}, minmax(0, 1fr))` }}
    >
      {diasComDiscs.map(dia => (
        <div key={dia.diaId} className="flex flex-col gap-1">
          <div className="rounded-md bg-muted/60 px-1 py-1 text-center">
            <p className="text-[10px] font-semibold capitalize leading-tight truncate">
              {formatarDia(dia.data)}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {dia.disciplinas.map(disc => {
              const cor = disc.cor || "#6366f1";
              return (
                <div
                  key={disc.id}
                  className="rounded-md border px-1.5 py-1"
                  style={{ backgroundColor: cor + "30", borderColor: cor + "80" }}
                >
                  <p className="text-[10px] font-medium leading-tight truncate text-center">
                    {disc.nome}
                  </p>
                  <p className="flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2 w-2" />
                      {formatarTempo(disc.minutosPlanejados)}
                    </span>
                    {disc.questoesPlanejadas > 0 && (
                      <span className="flex items-center gap-0.5">
                        <Target className="h-2 w-2" />
                        {disc.questoesPlanejadas}q
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function CicloPlanejadoCard({ cicloPlanejado: inicial, ciclosList, hoje }: CicloPlanejadoCardProps) {
  const cicloAtual = ciclosList.find(c => c.isCurrent);
  const [selectedId, setSelectedId] = useState<string>(cicloAtual?.id ?? ciclosList[0]?.id ?? "");
  const [dados, setDados] = useState<CicloPlanejado | null>(inicial);
  const [loading, setLoading] = useState(false);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setLoading(true);
    const result = await getCicloPlanejado(hoje, id);
    setDados(result);
    setLoading(false);
  }

  return (
    <Card className="bg-card border-primary/15">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center gap-2">
          <Image src="/logo-mvt.png" alt="Logo" width={80} height={20} className="object-contain flex-shrink-0" />
          <span className="text-xs font-semibold flex-shrink-0">Ciclo Planejado</span>
          {ciclosList.length > 0 && (
            <Select value={selectedId} onValueChange={handleSelect}>
              <SelectTrigger className="h-6 text-[10px] px-2 ml-auto w-auto min-w-0 max-w-[160px] border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ciclosList.map(c => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    Ciclo {c.numeroSemana}
                    {c.isCurrent && " (atual)"}
                    {" · "}
                    {formatarIntervalo(c.dataInicio, c.dataFim)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : (
          <CicloGrid cicloPlanejado={dados} />
        )}
      </CardContent>
    </Card>
  );
}
