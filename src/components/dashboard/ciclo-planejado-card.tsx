"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CicloPlanejado, getCicloPlanejado } from "@/interface/actions/dashboard/get-ciclo-planejado";
import { CicloInfo } from "@/interface/actions/dashboard/get-ciclos-plano";

interface CicloPlanejadoCardProps {
  cicloPlanejado: CicloPlanejado | null;
  ciclosList: CicloInfo[];
  hoje: string;
}

function formatarTempo(minutos: number): string {
  if (minutos <= 0) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}m`;
}

function formatarIntervalo(dataInicio: Date, dataFim: Date): string {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const d1 = `${String(ini.getUTCDate()).padStart(2, '0')}/${String(ini.getUTCMonth() + 1).padStart(2, '0')}`;
  const d2 = `${String(fim.getUTCDate()).padStart(2, '0')}/${String(fim.getUTCMonth() + 1).padStart(2, '0')}`;
  return `${d1}–${d2}`;
}

interface DisciplinaAgregada {
  id: string;
  nome: string;
  cor: string | null;
  totalMinutos: number;
  totalQuestoes: number;
}

function agregarDisciplinas(cicloPlanejado: CicloPlanejado): DisciplinaAgregada[] {
  const mapa = new Map<string, DisciplinaAgregada>();
  for (const dia of cicloPlanejado.dias) {
    for (const disc of dia.disciplinas) {
      const existente = mapa.get(disc.id);
      if (existente) {
        existente.totalMinutos += disc.minutosPlanejados;
        existente.totalQuestoes += disc.questoesPlanejadas;
      } else {
        mapa.set(disc.id, {
          id: disc.id,
          nome: disc.nome,
          cor: disc.cor,
          totalMinutos: disc.minutosPlanejados,
          totalQuestoes: disc.questoesPlanejadas,
        });
      }
    }
  }
  return Array.from(mapa.values()).sort((a, b) => b.totalMinutos - a.totalMinutos);
}

function CicloTabela({ cicloPlanejado }: { cicloPlanejado: CicloPlanejado | null }) {
  if (!cicloPlanejado) {
    return <p className="text-muted-foreground text-xs">Nenhum ciclo ativo</p>;
  }

  const disciplinas = agregarDisciplinas(cicloPlanejado);

  if (disciplinas.length === 0) {
    return <p className="text-muted-foreground text-xs">Nenhuma disciplina planejada</p>;
  }

  const totalMinutos = disciplinas.reduce((s, d) => s + d.totalMinutos, 0);
  const totalQuestoes = disciplinas.reduce((s, d) => s + d.totalQuestoes, 0);

  return (
    <div className="flex flex-col">
      {/* Cabeçalho */}
      <div className="grid gap-x-2 pb-1 border-b border-border/50 mb-1" style={{ gridTemplateColumns: '1fr 56px 56px' }}>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Disciplina</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Horas</span>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Questões</span>
      </div>

      {/* Linhas */}
      <div className="flex flex-col divide-y divide-border/30">
        {disciplinas.map(disc => (
          <div key={disc.id} className="grid gap-x-2 py-1 items-center" style={{ gridTemplateColumns: '1fr 56px 56px' }}>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: disc.cor ?? "#6366f1" }}
              />
              <span className="text-[10px] truncate">{disc.nome}</span>
            </div>
            <span className="text-[10px] text-right font-medium tabular-nums">
              {formatarTempo(disc.totalMinutos)}
            </span>
            <span className="text-[10px] text-right font-medium tabular-nums text-muted-foreground">
              {disc.totalQuestoes > 0 ? disc.totalQuestoes : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Totais */}
      <div className="grid gap-x-2 pt-1.5 mt-0.5 border-t border-border/50 items-center" style={{ gridTemplateColumns: '1fr 56px 56px' }}>
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
        <span className="text-[10px] text-right font-bold tabular-nums">{formatarTempo(totalMinutos)}</span>
        <span className="text-[10px] text-right font-bold tabular-nums text-muted-foreground">
          {totalQuestoes > 0 ? totalQuestoes : "—"}
        </span>
      </div>
    </div>
  );
}

export function CicloPlanejadoCard({ cicloPlanejado: inicial, ciclosList, hoje }: CicloPlanejadoCardProps) {
  const hojeDate = new Date(hoje + 'T12:00:00Z')
  const cicloHoje = ciclosList.find(c =>
    new Date(c.dataInicio) <= hojeDate && new Date(c.dataFim) >= hojeDate
  )
  const [selectedId, setSelectedId] = useState<string>(cicloHoje?.id ?? ciclosList[0]?.id ?? "");
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
    <Card className="bg-card border-primary/15 h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
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
      <CardContent className="px-3 pb-3 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : (
          <CicloTabela cicloPlanejado={dados} />
        )}
      </CardContent>
    </Card>
  );
}
