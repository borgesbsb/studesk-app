"use client";

import { useEffect, useState } from "react";
import { EvolucaoHorasCard } from "./evolucao-horas-card";
import { EvolucaoQuestoesCard } from "./evolucao-questoes-card";
import { getEvolucaoCiclo, EvolucaoCiclo } from "@/interface/actions/dashboard/get-evolucao-ciclo";
import { useDashboard } from "@/contexts/dashboard-context";

export function ProgressoCicloWrapper() {
  const { selectedDate, refreshTrigger } = useDashboard();
  const [evolucao, setEvolucao] = useState<EvolucaoCiclo | null>(null);
  const [loading, setLoading] = useState(true);

  const toLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    async function loadEvolucao() {
      setLoading(true);
      const data = await getEvolucaoCiclo(toLocalDateString(selectedDate));
      setEvolucao(data);
      setLoading(false);
    }

    loadEvolucao();
  }, [selectedDate, refreshTrigger]);

  if (loading) {
    return (
      <>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
        <div className="h-full flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <EvolucaoHorasCard evolucao={evolucao} />
      <EvolucaoQuestoesCard evolucao={evolucao} />
    </>
  );
}
