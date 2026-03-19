"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { DisciplinaCiclo } from "@/interface/actions/dashboard/get-disciplinas-ciclo";

interface DisciplinasCicloCardProps {
  disciplinas: DisciplinaCiclo[];
}

function formatarTempo(horas: number) {
  if (horas <= 0) return "0min";
  if (horas < 1) return `${Math.round(horas * 60)}min`;
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m === 0 ? `${h}h` : `${h}h${m}m`;
}

export function DisciplinasCicloCard({ disciplinas }: DisciplinasCicloCardProps) {
  if (disciplinas.length === 0) {
    return (
      <Card className="bg-card border-primary/15 h-full">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="flex items-center gap-2 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Disciplinas do Ciclo
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-muted-foreground text-sm">Nenhuma disciplina no ciclo atual</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-primary/15 h-full">
      <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-xs">
          <BookOpen className="h-3.5 w-3.5" />
          Disciplinas do Ciclo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex-1 overflow-y-auto min-h-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-[10px] text-muted-foreground">
              <th className="text-left pb-1 font-medium w-[35%]">Disciplina</th>
              <th className="text-left pb-1 font-medium w-[45%]">Progresso</th>
              <th className="text-right pb-1 font-medium w-[20%]">Horas</th>
            </tr>
          </thead>
          <tbody>
            {disciplinas.map((disc) => {
              const cor = disc.cor || "#6366f1";
              const pct = disc.minutosPlanejados > 0
                ? Math.min((disc.horasRealizadas / (disc.minutosPlanejados / 60)) * 100, 100)
                : 0;

              return (
                <tr key={disc.disciplinaId} className="group">
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: cor }}
                      />
                      <span className="text-[11px] font-medium truncate" title={disc.nome}>
                        {disc.nome}
                      </span>
                    </div>
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cor }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground w-7 text-right flex-shrink-0">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-1 text-right">
                    <span className="text-[10px] font-semibold">{formatarTempo(disc.horasRealizadas)}</span>
                    <span className="text-[9px] text-muted-foreground"> / {formatarTempo(disc.minutosPlanejados / 60)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
