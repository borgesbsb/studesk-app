"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { DisciplinaCiclo } from "@/interface/actions/dashboard/get-disciplinas-ciclo";

interface DisciplinasCicloCardProps {
  disciplinas: DisciplinaCiclo[];
}

export function DisciplinasCicloCard({ disciplinas }: DisciplinasCicloCardProps) {
  if (disciplinas.length === 0) {
    return (
      <Card className="bg-card border-primary/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="h-6 w-6" />
            Disciplinas do Ciclo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Nenhuma disciplina no ciclo atual</p>
        </CardContent>
      </Card>
    );
  }

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

  return (
    <Card className="bg-card border-primary/15">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-2 text-xs">
          <BookOpen className="h-3.5 w-3.5" />
          Disciplinas do Ciclo
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {disciplinas.map((disc) => {
            const progressoHoras = disc.minutosPlanejados > 0
              ? Math.min((disc.horasRealizadas / disc.minutosPlanejados) * 100, 100)
              : 0;
            const cor = disc.cor || "#6366f1";

            return (
              <div
                key={disc.disciplinaId}
                className="p-2 border rounded-md space-y-1"
                style={{ borderLeftColor: cor, borderLeftWidth: "3px" }}
              >
                <p className="text-[11px] font-semibold truncate" title={disc.nome}>
                  {disc.nome}
                </p>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>{formatarTempo(disc.horasRealizadas)}</span>
                  <span>{formatarTempo(disc.minutosPlanejados / 60)}</span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progressoHoras}%`, backgroundColor: cor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
