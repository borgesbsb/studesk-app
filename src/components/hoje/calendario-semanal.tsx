"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { useMemo } from "react";
import { useDashboard } from "@/contexts/dashboard-context";

export function CalendarioSemanal() {
  const hoje = useMemo(() => startOfDay(new Date()), []);
  const { selectedDate, setSelectedDate } = useDashboard();

  // Gerar todos os dias do mês atual
  const diasDoMes = useMemo(() => {
    const inicio = startOfMonth(hoje);
    const fim = endOfMonth(hoje);
    const dias = eachDayOfInterval({ start: inicio, end: fim });

    return dias.map((data) => ({
      data,
      dia: format(data, "d", { locale: ptBR }),
      diaSemana: format(data, "EEE", { locale: ptBR }),
      isHoje: isSameDay(data, hoje),
      isSelecionado: isSameDay(data, selectedDate),
    }));
  }, [hoje, selectedDate]);

  const selecionarDia = (data: Date) => {
    console.log('📅 [CalendarioSemanal] Data selecionada:', {
      data: data.toISOString(),
      dataFormatada: format(data, 'dd/MM/yyyy', { locale: ptBR })
    });
    setSelectedDate(data);
  };

  const mesAno = format(hoje, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          {mesAno}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Scroll horizontal nativo */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 pb-2">
            {diasDoMes.map((dia, index) => (
              <button
                key={index}
                onClick={() => selecionarDia(dia.data)}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[64px] h-24 rounded-xl border-2 transition-all duration-200
                  hover:bg-muted/80
                  ${
                    dia.isSelecionado
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                      : dia.isHoje
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-md'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/30 hover:bg-muted/50'
                  }
                `}
              >
                {/* Dia da semana */}
                <span className={`text-xs font-medium uppercase ${
                  dia.isSelecionado ? 'opacity-90' : dia.isHoje ? 'opacity-80' : 'opacity-70'
                }`}>
                  {dia.diaSemana}
                </span>

                {/* Número do dia */}
                <span className={`text-xl font-bold leading-none`}>
                  {dia.dia}
                </span>

                {/* Indicador de selecionado */}
                {dia.isSelecionado && (
                  <div className="w-1 h-1 bg-primary-foreground rounded-full mt-1" />
                )}

                {/* Indicador de hoje (quando não está selecionado) */}
                {dia.isHoje && !dia.isSelecionado && (
                  <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Data selecionada */}
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            {format(selectedDate, "EEE, d 'de' MMM", { locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
