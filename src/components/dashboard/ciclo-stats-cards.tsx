"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, ClipboardList, CheckCircle } from "lucide-react";
import { ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo";

interface CicloStatsCardsProps {
  progresso: ProgressoCiclo | null;
}

export function CicloStatsCards({ progresso }: CicloStatsCardsProps) {
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

  const stats = [
    {
      label: "Horas Plan.",
      value: progresso ? formatarTempo(progresso.minutosPlanejados / 60) : "0h",
      icon: Target,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Horas Real.",
      value: progresso ? formatarTempo(progresso.horasRealizadas) : "0h",
      icon: Clock,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Quest. Plan.",
      value: progresso ? progresso.questoesPlanejadas.toString() : "0",
      icon: ClipboardList,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "Quest. Real.",
      value: progresso ? progresso.questoesRealizadas.toString() : "0",
      icon: CheckCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 h-full">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-card border-primary/15">
            <CardContent className="flex flex-col items-center justify-center gap-1 px-3 py-3">
              <div className={`p-2 rounded ${stat.bg} shrink-0`}>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
              <p className="text-2xl font-bold leading-tight">{stat.value}</p>
            </CardContent>
            </Card>
          ))}
    </div>
  );
}
