"use client";

import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { adicionarTempoManual } from "@/interface/actions/dashboard/adicionar-tempo-manual";

interface CronometroState {
  segundos: number;
  rodando: boolean;
  disciplinaId: string | null;
  disciplinaNome: string | null;
  modalAberto: boolean;
}

interface CronometroContextType {
  state: CronometroState;
  iniciar: (disciplinaId: string, disciplinaNome: string) => void;
  pausar: () => void;
  continuar: () => void;
  resetar: () => void;
  abrirModal: () => void;
  fecharModal: () => void;
  salvar: (onSuccess?: () => void) => Promise<unknown>;
  isAtivo: boolean;
}

const CronometroContext = createContext<CronometroContextType | null>(null);

export function CronometroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CronometroState>({
    segundos: 0,
    rodando: false,
    disciplinaId: null,
    disciplinaNome: null,
    modalAberto: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const limpar = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state.rodando) {
      intervalRef.current = setInterval(() => {
        setState(prev => ({ ...prev, segundos: prev.segundos + 1 }));
      }, 1000);
    } else {
      limpar();
    }
    return limpar;
  }, [state.rodando, limpar]);

  const iniciar = useCallback((disciplinaId: string, disciplinaNome: string) => {
    setState({
      segundos: 0,
      rodando: true,
      disciplinaId,
      disciplinaNome,
      modalAberto: true,
    });
  }, []);

  const pausar = useCallback(() => {
    setState(prev => ({ ...prev, rodando: false }));
  }, []);

  const continuar = useCallback(() => {
    setState(prev => ({ ...prev, rodando: true }));
  }, []);

  const resetar = useCallback(() => {
    setState({
      segundos: 0,
      rodando: false,
      disciplinaId: null,
      disciplinaNome: null,
      modalAberto: false,
    });
  }, []);

  const abrirModal = useCallback(() => {
    setState(prev => ({ ...prev, modalAberto: true }));
  }, []);

  const fecharModal = useCallback(() => {
    setState(prev => ({ ...prev, modalAberto: false }));
  }, []);

  const salvar = useCallback(async (onSuccess?: () => void) => {
    if (!state.disciplinaId || state.segundos < 60) return;

    const horas = Math.floor(state.segundos / 3600);
    const minutos = Math.floor((state.segundos % 3600) / 60);

    try {
      const result = await adicionarTempoManual({
        disciplinaId: state.disciplinaId,
        horas,
        minutos,
      });

      if (result.success) {
        onSuccess?.();
        window.dispatchEvent(new Event('cronometro-saved'));
        setState({
          segundos: 0,
          rodando: false,
          disciplinaId: null,
          disciplinaNome: null,
          modalAberto: false,
        });
      }

      return result;
    } catch (error) {
      console.error("Erro ao salvar tempo do cronômetro:", error);
      throw error;
    }
  }, [state.disciplinaId, state.segundos]);

  const isAtivo = state.disciplinaId !== null;

  return (
    <CronometroContext.Provider value={{
      state,
      iniciar,
      pausar,
      continuar,
      resetar,
      abrirModal,
      fecharModal,
      salvar,
      isAtivo,
    }}>
      {children}
    </CronometroContext.Provider>
  );
}

export function useCronometro() {
  const context = useContext(CronometroContext);
  if (!context) {
    throw new Error("useCronometro deve ser usado dentro de CronometroProvider");
  }
  return context;
}
