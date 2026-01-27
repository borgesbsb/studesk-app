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

  // Listener para atualizar automaticamente quando progresso for salvo no PDF viewer
  useEffect(() => {
    let ultimoTimestamp = localStorage.getItem('progressoAtualizado') || '0';
    console.log('🎧 [LISTENER] Iniciado! Timestamp inicial:', ultimoTimestamp);

    const checkProgressoAtualizado = () => {
      const novoTimestamp = localStorage.getItem('progressoAtualizado') || '0';

      if (novoTimestamp !== ultimoTimestamp && novoTimestamp !== '0') {
        console.log('\n🔔 ===== ATUALIZAÇÃO DETECTADA =====');
        console.log('   Timestamp anterior:', ultimoTimestamp);
        console.log('   Timestamp novo:', novoTimestamp);
        console.log('   Diferença (ms):', parseInt(novoTimestamp) - parseInt(ultimoTimestamp));

        ultimoTimestamp = novoTimestamp;

        console.log('🔄 Recarregando matérias do dia...');
        // Recarregar matérias
        handleTempoAdicionado();
      }
    };

    // Verificar a cada 2 segundos
    console.log('⏰ Polling configurado para verificar a cada 2 segundos');
    const interval = setInterval(checkProgressoAtualizado, 2000);

    return () => {
      console.log('🛑 [LISTENER] Desativado');
      clearInterval(interval);
    };
  }, [handleTempoAdicionado]); // Dependência de handleTempoAdicionado

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <MateriasHoje materias={materias} onTempoAdicionado={handleTempoAdicionado} />;
}