"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useDashboard } from "@/contexts/dashboard-context";

export function CalendarioSemanal() {
  // Memoizar 'hoje' para que não seja recriado a cada render
  const hoje = useMemo(() => startOfDay(new Date()), []);
  const { selectedDate, setSelectedDate } = useDashboard();
  const [startDay, setStartDay] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  
  // Gerar 7 dias consecutivos a partir do startDay
  const gerarDias = (startOffset: number) => {
    const dias = [];
    for (let i = 0; i < 7; i++) {
      // Usar startOfDay para garantir que a data está normalizada
      const data = startOfDay(addDays(hoje, startOffset + i));
      dias.push({
        data,
        dia: format(data, "d", { locale: ptBR }),
        diaSemana: format(data, "EEE", { locale: ptBR }),
        mes: format(data, "MMM", { locale: ptBR }),
        isHoje: startOffset + i === 0,
        isSelecionado: isSameDay(data, selectedDate),
        offset: startOffset + i
      });
    }
    return dias;
  };

  // Função para selecionar um dia
  const selecionarDia = (data: Date) => {
    if (!isTransitioning) {
      console.log('📅 [CalendarioSemanal] Data selecionada:', {
        data: data.toISOString(),
        dataFormatada: format(data, 'dd/MM/yyyy', { locale: ptBR }),
        isTransitioning
      });
      setSelectedDate(data);
    } else {
      console.log('⏸️ [CalendarioSemanal] Clique ignorado - em transição');
    }
  };

  // Inicializar mostrando o dia atual no centro (posição 3)
  useEffect(() => {
    setStartDay(-3); // Mostrar 3 dias antes do hoje até 3 dias depois
  }, []);

  const diasVisiveis = gerarDias(startDay);

  const nextDay = () => {
    if (!isTransitioning) {
      setDirection('left');
      setIsTransitioning(true);
      setStartDay(startDay + 1);
      
      setTimeout(() => {
        setIsTransitioning(false);
        setDirection(null);
      }, 800);
    }
  };

  const prevDay = () => {
    if (!isTransitioning) {
      setDirection('right');
      setIsTransitioning(true);
      setStartDay(startDay - 1);
      
      setTimeout(() => {
        setIsTransitioning(false);
        setDirection(null);
      }, 800);
    }
  };

  const goToToday = () => {
    if (!isTransitioning) {
      setIsTransitioning(true);
      setStartDay(-3);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 800);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Calendário Semanal
          </CardTitle>
          <button
            onClick={goToToday}
            className="text-sm text-primary hover:underline"
          >
            Hoje
          </button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="relative">
          {/* Navegação */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevDay}
              disabled={isTransitioning}
              className={`p-2 rounded-lg transition-all ${
                isTransitioning 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-muted hover:scale-110"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            
            <span className={`text-sm font-medium text-muted-foreground transition-all duration-300 ${
              isTransitioning ? "scale-95 opacity-70" : "scale-100 opacity-100"
            }`}>
              {format(diasVisiveis[3].data, "MMM yyyy", { locale: ptBR })}
            </span>
            
            <button
              onClick={nextDay}
              disabled={isTransitioning}
              className={`p-2 rounded-lg transition-all ${
                isTransitioning 
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:bg-muted hover:scale-110"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Grid dos dias com efeitos de transição suaves */}
          <div className={`grid grid-cols-7 gap-2 transition-all duration-700 ease-out ${
            isTransitioning ? 'opacity-95' : 'opacity-100'
          }`}>
            {diasVisiveis.map((dia, index) => {
              // Calcular movimento suave baseado na direção
              let translateX = 0;
              let translateY = 0;
              let scale = 1;
              let opacity = 1;
              
              if (isTransitioning && direction) {
                const waveOffset = Math.sin((index + 1) * 0.5) * 8;
                const delayFactor = (index + 1) * 0.1;
                
                if (direction === 'left') {
                  translateX = -15 + waveOffset;
                  translateY = waveOffset * 0.3;
                  scale = 0.98 + (Math.sin(index * 0.8) * 0.03);
                } else if (direction === 'right') {
                  translateX = 15 - waveOffset;
                  translateY = -waveOffset * 0.3;
                  scale = 0.98 + (Math.cos(index * 0.8) * 0.03);
                }
                
                opacity = 0.85 + (Math.sin(index * 0.5) * 0.1);
              }
              
              return (
                <div
                  key={`${dia.offset}`}
                  onClick={() => selecionarDia(dia.data)}
                  className={`
                    flex flex-col items-center p-3 rounded-lg border cursor-pointer
                    transition-all duration-700 ease-out
                    ${dia.isSelecionado
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110 ring-2 ring-primary/30" 
                      : dia.isHoje 
                      ? "bg-primary/10 text-primary border-primary/50 shadow-md ring-1 ring-primary/20" 
                      : "bg-background hover:bg-muted border-border hover:shadow-md hover:scale-105"
                    }
                  `}
                  style={{
                    transform: isTransitioning 
                      ? `translate(${translateX}px, ${translateY}px) scale(${scale})`
                      : 'translate(0px, 0px) scale(1)',
                    opacity: isTransitioning ? opacity : 1,
                    transitionDelay: `${index * 80}ms`,
                    transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)'
                  }}
                >
                  <span className="text-xs font-medium uppercase tracking-wide mb-1">
                    {dia.diaSemana}
                  </span>
                  <span className="text-xl font-bold">
                    {dia.dia}
                  </span>
                  {dia.dia === "1" && (
                    <span className="text-xs text-muted-foreground mt-1">
                      {dia.mes}
                    </span>
                  )}
                  {dia.isSelecionado && (
                    <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full mt-1 animate-pulse" />
                  )}
                  {dia.isHoje && !dia.isSelecionado && (
                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}