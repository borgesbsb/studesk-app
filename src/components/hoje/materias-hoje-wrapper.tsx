"use client";

import { useEffect, useState, useCallback } from "react";
import { MateriasHoje } from "./materias-hoje";
import { useDashboard } from "@/contexts/dashboard-context";
import { getMateriasDoDia, MateriaDoDia } from "@/interface/actions/dashboard/materias-do-dia";

export function MateriasHojeWrapper() {
  const { selectedDate } = useDashboard();
  const [materias, setMaterias] = useState<MateriaDoDia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleTempoAdicionado = useCallback(async () => {
    // Recarregar matérias quando tempo for adicionado
    console.log('🔄 [WRAPPER] handleTempoAdicionado chamado');
    setIsLoading(true);
    try {
      console.log('🔄 [WRAPPER] Recarregando dados do dia:', selectedDate.toISOString());
      const materiasData = await getMateriasDoDia(selectedDate);
      console.log('🔄 [WRAPPER] Dados recarregados:', materiasData.length, 'matérias');
      setMaterias(materiasData);
    } catch (error) {
      console.error('❌ [WRAPPER] Erro ao recarregar matérias:', error);
    } finally {
      setIsLoading(false);
      console.log('✅ [WRAPPER] Refresh concluído');
    }
  }, [selectedDate]);

  useEffect(() => {
    async function carregarMaterias() {
      setIsLoading(true);
      try {
        const materiasData = await getMateriasDoDia(selectedDate);
        setMaterias(materiasData);
      } catch (error) {
        console.error('Erro ao carregar matérias:', error);
        setMaterias([]);
      } finally {
        setIsLoading(false);
      }
    }

    carregarMaterias();
  }, [selectedDate]);

  // Recarregar dados quando a página ganhar foco (igual ao mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Página ganhou foco - recarregando matérias...');
        handleTempoAdicionado();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleTempoAdicionado]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <MateriasHoje materias={materias} onTempoAdicionado={handleTempoAdicionado} />;
}