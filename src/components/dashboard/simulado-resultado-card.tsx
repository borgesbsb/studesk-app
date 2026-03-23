"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { ResultadoSimulado, getResultadoSimuladoCicloAtual } from "@/interface/actions/dashboard/get-resultado-simulado";
import { CicloInfo } from "@/interface/actions/dashboard/get-ciclos-plano";

interface SimuladoResultadoCardProps {
  resultado: ResultadoSimulado | null;
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

function corPercentual(pct: number) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

function labelPercentual(pct: number) {
  if (pct >= 70) return "text-green-500";
  if (pct >= 50) return "text-yellow-500";
  return "text-red-500";
}

// Ciclos que têm simulado associado
function ciclosComSimulado(ciclosList: CicloInfo[]) {
  return ciclosList.filter(c => (c as any).simuladoId !== undefined ? (c as any).simuladoId : true);
}

export function SimuladoResultadoCard({ resultado: inicial, ciclosList, hoje }: SimuladoResultadoCardProps) {
  // Ciclo anterior = último ciclo cuja dataFim já passou
  const hojeDate = new Date(hoje + 'T12:00:00Z')
  const cicloAnterior = [...ciclosList]
    .filter(c => new Date(c.dataFim) < hojeDate)
    .pop()
  const defaultId = cicloAnterior?.id ?? ciclosList[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(defaultId);
  const [dados, setDados] = useState<ResultadoSimulado | null>(inicial);
  const [loading, setLoading] = useState(false);

  async function handleSelect(id: string) {
    setSelectedId(id);
    setLoading(true);
    const result = await getResultadoSimuladoCicloAtual(hoje, id);
    setDados(result);
    setLoading(false);
  }

  const semResultado = !dados || dados.totalAcertos === 0;

  return (
    <Card className="bg-card border-primary/15 h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold flex-shrink-0">Simulado</span>
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
          {dados && !semResultado && (
            <span className={`text-sm font-bold flex-shrink-0 ${labelPercentual(dados.percentualGeral)}`}>
              {dados.percentualGeral.toFixed(1)}%
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-3 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          </div>
        ) : !dados ? (
          <p className="text-muted-foreground text-xs text-center">Nenhum simulado neste ciclo</p>
        ) : semResultado ? (
          <p className="text-muted-foreground text-xs text-center">
            Simulado disponível — registre seus acertos em{" "}
            <span className="font-medium">Simulados</span>
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {dados.disciplinas.map(d => {
              const pct = d.totalQuestoes > 0 ? (d.acertos / d.totalQuestoes) * 100 : 0;
              const cor = corPercentual(pct);
              return (
                <div key={d.disciplinaId} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.cor ?? "#6366f1" }}
                  />
                  <span className="text-[10px] truncate flex-1 text-muted-foreground">{d.nome}</span>
                  <div className="w-16 h-1.5 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cor }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-semibold w-8 text-right flex-shrink-0"
                    style={{ color: cor }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
            <div className="border-t border-border/50 pt-1.5 mt-0.5 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground font-medium">Total</span>
              <span className="text-[10px] text-muted-foreground">
                {dados.totalAcertos}/{dados.totalQuestoes} acertos
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
