"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContribuicaoDia } from "@/interface/actions/dashboard/get-contribuicoes-estudo";

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// Formata data YYYY-MM-DD para DD/MM/YYYY sem usar Date
function formatarDataString(dataStr: string): string {
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

interface ContribuicoesCardProps {
  contribuicoes: ContribuicaoDia[];
  dataInicio?: Date;
  dataFim?: Date;
}

export function ContribuicoesCard({
  contribuicoes,
}: ContribuicoesCardProps) {
  const { semanas, meses, maxHoras, totalContrib } = useMemo(() => {
    // Mapa de data -> horas
    const mapaHoras = new Map<string, number>();
    for (const c of contribuicoes) {
      mapaHoras.set(c.data, c.horas);
    }

    // Sempre mostrar últimas 52 semanas (1 ano) até hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Fim = sábado desta semana (para completar a semana atual)
    const fim = new Date(hoje);
    const diaSemanaHoje = hoje.getDay();
    fim.setDate(fim.getDate() + (6 - diaSemanaHoje));

    // Início = domingo de 52 semanas atrás
    const inicio = new Date(fim);
    inicio.setDate(inicio.getDate() - (52 * 7) + 1);
    // Ajustar para domingo
    const diaSemanaInicio = inicio.getDay();
    if (diaSemanaInicio !== 0) {
      inicio.setDate(inicio.getDate() - diaSemanaInicio);
    }

    // Gerar TODAS as semanas (colunas) - sempre 53 colunas
    const semanas: { data: string; horas: number; diaSemana: number; futuro: boolean }[][] = [];
    const meses: { nome: string; coluna: number }[] = [];
    let mesAnterior = -1;

    const cursor = new Date(inicio);
    let coluna = 0;

    while (cursor <= fim) {
      const semana: { data: string; horas: number; diaSemana: number; futuro: boolean }[] = [];

      for (let d = 0; d < 7; d++) {
        if (cursor > fim) break;

        const chave = cursor.toISOString().split("T")[0];
        const diaSemana = cursor.getDay();
        const futuro = cursor > hoje;

        semana.push({
          data: chave,
          horas: futuro ? 0 : (mapaHoras.get(chave) || 0),
          diaSemana,
          futuro,
        });

        // Rastrear mudança de mês (no dia 1 ou primeiro dia visível do mês)
        const mesAtual = cursor.getMonth();
        if (mesAtual !== mesAnterior) {
          meses.push({
            nome: cursor.toLocaleDateString("pt-BR", { month: "short" }),
            coluna,
          });
          mesAnterior = mesAtual;
        }

        cursor.setDate(cursor.getDate() + 1);
      }

      if (semana.length > 0) {
        semanas.push(semana);
        coluna++;
      }
    }

    // Calcular max para escala de cores
    let maxHoras = 0;
    let totalContrib = 0;
    for (const c of contribuicoes) {
      if (c.horas > maxHoras) maxHoras = c.horas;
      totalContrib += c.horas;
    }
    if (maxHoras === 0) maxHoras = 1;

    return { semanas, meses, maxHoras, totalContrib };
  }, [contribuicoes]);

  const getCor = (horas: number, futuro: boolean) => {
    if (futuro) return "transparent";
    if (horas === 0) return "var(--muted)";
    const intensidade = Math.min(horas / maxHoras, 1);
    if (intensidade <= 0.25) return "#9be9a8";
    if (intensidade <= 0.5) return "#40c463";
    if (intensidade <= 0.75) return "#30a14e";
    return "#216e39";
  };

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const tamanho = 11;
  const gap = 2;
  const passo = tamanho + gap;
  const labelW = 24;
  const headerH = 14;
  const svgW = labelW + semanas.length * passo;
  const svgH = headerH + 7 * passo;

  const formatarHoras = (h: number) => {
    if (h < 1) return `${Math.round(h * 60)}min`;
    const hi = Math.floor(h);
    const m = Math.round((h - hi) * 60);
    if (m === 0) return `${hi}h`;
    return `${hi}h${m}m`;
  };

  return (
    <Card className="bg-card border-primary/15 h-full">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-xs flex items-center gap-2">
          {formatarHoras(totalContrib)} de estudo no último ano
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div>
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="block w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Labels dos meses */}
            {meses.map((mes, i) => (
              <text
                key={i}
                x={labelW + mes.coluna * passo}
                y={10}
                fontSize="9"
                fill="currentColor"
                opacity="0.5"
              >
                {mes.nome}
              </text>
            ))}

            {/* Labels dos dias da semana */}
            {[1, 3, 5].map((d) => (
              <text
                key={d}
                x={0}
                y={headerH + d * passo + tamanho - 2}
                fontSize="9"
                fill="currentColor"
                opacity="0.5"
              >
                {diasSemana[d]}
              </text>
            ))}

            {/* Quadradinhos */}
            {semanas.map((semana, col) =>
              semana.map((dia) => (
                <rect
                  key={dia.data}
                  x={labelW + col * passo}
                  y={headerH + dia.diaSemana * passo}
                  width={tamanho}
                  height={tamanho}
                  rx={2}
                  fill={getCor(dia.horas, dia.futuro)}
                  stroke="currentColor"
                  strokeOpacity={dia.futuro ? 0 : 0.3}
                  strokeWidth={0.5}
                  opacity={dia.futuro ? 0 : (dia.horas === 0 ? 0.4 : 1)}
                >
                  <title>
                    {new Date(dia.data + "T12:00:00").toLocaleDateString(
                      "pt-BR",
                      { day: "2-digit", month: "2-digit", year: "numeric" }
                    )}
                    :{" "}
                    {dia.horas > 0
                      ? `${formatarHoras(dia.horas)} de estudo`
                      : "Sem estudo"}
                  </title>
                </rect>
              ))
            )}
          </svg>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] text-muted-foreground">Menos</span>
          {[0, 0.25, 0.5, 0.75, 1].map((nivel) => (
            <div
              key={nivel}
              className="rounded-sm"
              style={{
                width: 10,
                height: 10,
                backgroundColor: getCor(nivel * maxHoras, false),
                opacity: nivel === 0 ? 0.4 : 1,
              }}
            />
          ))}
          <span className="text-[9px] text-muted-foreground">Mais</span>
        </div>
      </CardContent>
    </Card>
  );
}
