"use client";

import { useEffect, useState, useCallback } from "react";
import { MateriasHojeCardStyle } from "./materias-hoje-card-style";
import { useDashboard } from "@/contexts/dashboard-context";
import { getMateriasDoDia, MateriaDoDia } from "@/interface/actions/dashboard/materias-do-dia";

export function MateriasHojeWrapper() {
  const { selectedDate } = useDashboard();
  const [materias, setMaterias] = useState<MateriaDoDia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formata a data como YYYY-MM-DD usando o timezone local do usuário
  // Evita bug de fuso: new Date() às 23h UTC-3 serializa como UTC do dia seguinte
  const toLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleTempoAdicionado = useCallback(async () => {
    // Recarregar matérias quando tempo for adicionado
    console.log('🔄 [WRAPPER] handleTempoAdicionado chamado');
    setIsLoading(true);
    try {
      const dateStr = toLocalDateString(selectedDate);
      console.log('🔄 [WRAPPER] Recarregando dados do dia:', dateStr);
      const materiasData = await getMateriasDoDia(dateStr);
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
        const dateStr = toLocalDateString(selectedDate);
        const materiasData = await getMateriasDoDia(dateStr);
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

  // Recarregar quando cronômetro salvar
  useEffect(() => {
    const handler = () => handleTempoAdicionado();
    window.addEventListener('cronometro-saved', handler);
    return () => window.removeEventListener('cronometro-saved', handler);
  }, [handleTempoAdicionado]);

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

  return <MateriasHojeCardStyle materias={materias} onTempoAdicionado={handleTempoAdicionado} />;
}