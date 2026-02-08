"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressoCiclo } from "@/interface/actions/dashboard/get-progresso-ciclo";

interface HourglassCardProps {
  progresso: ProgressoCiclo | null;
}

export function HourglassCard({ progresso }: HourglassCardProps) {
  const [progress, setProgress] = useState(0);
  const [diasDecorridos, setDiasDecorridos] = useState(0);
  const [totalDias, setTotalDias] = useState(0);

  useEffect(() => {
    if (!progresso) return;
    const inicio = new Date(progresso.dataInicio);
    const fim = new Date(progresso.dataFim);
    const hoje = new Date();
    const totalMs = fim.getTime() - inicio.getTime();
    const decorridoMs = hoje.getTime() - inicio.getTime();
    const dias = Math.ceil(totalMs / (1000 * 60 * 60 * 24));
    setTotalDias(dias);
    setDiasDecorridos(Math.min(Math.max(Math.ceil(decorridoMs / (1000 * 60 * 60 * 24)), 0), dias));
    setProgress(totalMs > 0 ? Math.min(Math.max((decorridoMs / totalMs) * 100, 0), 100) : 0);
  }, [progresso]);

  const sandColor = "#c4956a";
  const isFlowing = progress < 100;

  const topY = 6;
  const neckTopY = 27;
  const neckBotY = 33;
  const botY = 54;

  const topSandLevel = topY + (progress / 100) * (neckTopY - topY);
  const botSandLevel = botY - (progress / 100) * (botY - neckBotY);

  const particles = [
    { cx: 19.7, delay: 0 },
    { cx: 20.3, delay: 0.15 },
    { cx: 20.0, delay: 0.30 },
    { cx: 19.5, delay: 0.45 },
    { cx: 20.5, delay: 0.60 },
    { cx: 20.1, delay: 0.75 },
  ];

  const formatarData = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

  return (
    <Card className="bg-card border-primary/15 h-full w-full">
      <CardContent className="p-3 h-full flex flex-col items-center justify-between gap-1">
        {/* Info topo */}
        <div className="text-center">
          <p className="text-xs font-semibold">{progresso?.nomeCiclo || "Sem ciclo"}</p>
          {progresso && (
            <p className="text-[9px] text-muted-foreground">
              {formatarData(new Date(progresso.dataInicio))} - {formatarData(new Date(progresso.dataFim))}
            </p>
          )}
        </div>

        {/* Ampulheta */}
        <div className="flex-1 w-full flex items-center justify-center min-h-0">
          <svg viewBox="0 0 40 60" className="h-full max-h-full text-foreground" preserveAspectRatio="xMidYMid meet">
            <defs>
              <clipPath id="hg-top-clip">
                <polygon points="7,6 33,6 21.5,27 18.5,27" />
              </clipPath>
              <clipPath id="hg-bot-clip">
                <polygon points="18.5,33 21.5,33 33,54 7,54" />
              </clipPath>
            </defs>

            <path
              d="M 7,6 L 33,6 L 21.5,27 L 21.5,33 L 33,54 L 7,54 L 18.5,33 L 18.5,27 Z"
              fill="currentColor" opacity="0.03"
            />

            {topSandLevel < neckTopY && (
              <path
                d={`M 0,${topSandLevel} Q 20,${topSandLevel + 2} 40,${topSandLevel} L 40,${neckTopY} L 0,${neckTopY} Z`}
                fill={sandColor} clipPath="url(#hg-top-clip)"
              />
            )}

            {botSandLevel < botY && (
              <path
                d={`M 0,${botSandLevel} Q 20,${botSandLevel - 2} 40,${botSandLevel} L 40,${botY} L 0,${botY} Z`}
                fill={sandColor} clipPath="url(#hg-bot-clip)"
              />
            )}

            {isFlowing && (
              <rect x="19.3" y={neckTopY} width="1.4" height={neckBotY - neckTopY} fill={sandColor} opacity="0.6" rx="0.7" />
            )}

            {isFlowing && particles.map((p, i) => (
              <circle key={i} cx={p.cx} r="0.8" fill={sandColor}>
                <animate attributeName="cy" values={`${neckTopY - 1};${neckBotY + 1}`} dur="0.9s" begin={`${p.delay}s`} repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 1 1" />
                <animate attributeName="opacity" values="0;0.9;0.9;0" keyTimes="0;0.15;0.75;1" dur="0.9s" begin={`${p.delay}s`} repeatCount="indefinite" />
              </circle>
            ))}

            <path
              d="M 7,6 L 33,6 L 21.5,27 L 21.5,33 L 33,54 L 7,54 L 18.5,33 L 18.5,27 Z"
              fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.2" strokeLinejoin="round"
            />
            <rect x="5" y="3" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
            <rect x="5" y="54" width="30" height="3" rx="1.5" fill="currentColor" opacity="0.15" />
          </svg>
        </div>

        {/* Info base */}
        <div className="text-center">
          <p className="text-lg font-bold leading-tight">{Math.round(progress)}%</p>
          <p className="text-[9px] text-muted-foreground">Dia {diasDecorridos} de {totalDias}</p>
        </div>
      </CardContent>
    </Card>
  );
}
