"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo";

interface CicloProgressoCardProps {
  progresso: ProgressoCiclo | null;
}

export function CicloProgressoCard({ progresso }: CicloProgressoCardProps) {
  const [progressoPct, setProgressoPct] = useState(0);
  const [diasDecorridos, setDiasDecorridos] = useState(0);
  const [totalDias, setTotalDias] = useState(0);

  useEffect(() => {
    if (!progresso) return;

    const inicio = new Date(progresso.dataInicio);
    const fim = new Date(progresso.dataFim);
    const hoje = new Date();

    const totalMs = fim.getTime() - inicio.getTime();
    const decorridoMs = hoje.getTime() - inicio.getTime();

    setTotalDias(Math.ceil(totalMs / (1000 * 60 * 60 * 24)));
    setDiasDecorridos(Math.min(Math.max(Math.ceil(decorridoMs / (1000 * 60 * 60 * 24)), 0), Math.ceil(totalMs / (1000 * 60 * 60 * 24))));
    setProgressoPct(totalMs > 0 ? Math.min(Math.max((decorridoMs / totalMs) * 100, 0), 100) : 0);
  }, [progresso]);

  if (!progresso) {
    return (
      <Card className="bg-card border-primary/15">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Nenhum ciclo ativo</p>
        </CardContent>
      </Card>
    );
  }

  const inicio = new Date(progresso.dataInicio);
  const fim = new Date(progresso.dataFim);

  const formatarData = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <Card className="bg-secondary border-primary/15">
      <CardContent className="py-2 px-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">{progresso.nomeCiclo}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-muted-foreground">{formatarData(inicio)}</span>
              <span className="text-[9px] font-semibold">Dia {diasDecorridos} de {totalDias}</span>
              <span className="text-[9px] text-muted-foreground">{formatarData(fim)}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all bg-blue-500"
                style={{ width: `${Math.round(Math.max(progressoPct, 1))}%` }}
              />
            </div>
          </div>

          <span className="text-sm font-bold shrink-0">{Math.round(progressoPct)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
