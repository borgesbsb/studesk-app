"use client"

import { useMemo } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface SimuladoDisciplina {
  disciplina: { id: string; nome: string; cor: string | null }
  percentual: number
}

interface Simulado {
  id: string
  nome: string
  dataRealizacao: Date
  percentualGeral: number
  disciplinas: SimuladoDisciplina[]
}

interface EvolucaoChartProps {
  simulados: Simulado[]
}

export function EvolucaoChart({ simulados }: EvolucaoChartProps) {
  const { disciplinasUnicas, pontos } = useMemo(() => {
    const discMap = new Map<string, { id: string; nome: string; cor: string }>()
    for (const s of simulados) {
      for (const d of s.disciplinas) {
        if (!discMap.has(d.disciplina.id)) {
          discMap.set(d.disciplina.id, {
            id: d.disciplina.id,
            nome: d.disciplina.nome,
            cor: d.disciplina.cor || '#3b82f6'
          })
        }
      }
    }

    // Ordenar simulados por data crescente para o gráfico
    const ordenados = [...simulados].sort(
      (a, b) => new Date(a.dataRealizacao).getTime() - new Date(b.dataRealizacao).getTime()
    )

    return {
      disciplinasUnicas: Array.from(discMap.values()),
      pontos: ordenados
    }
  }, [simulados])

  if (simulados.length < 2) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Registre pelo menos 2 simulados para visualizar a evolução.
      </p>
    )
  }

  const HEIGHT = 200
  const PADDING_LEFT = 40
  const PADDING_RIGHT = 16
  const PADDING_TOP = 16
  const PADDING_BOTTOM = 32

  const xStep = pontos.length > 1
    ? (600 - PADDING_LEFT - PADDING_RIGHT) / (pontos.length - 1)
    : 0

  const toY = (pct: number) =>
    PADDING_TOP + (HEIGHT - PADDING_TOP - PADDING_BOTTOM) * (1 - pct / 100)

  const buildPath = (discId: string) => {
    const pts = pontos.map((s, i) => {
      const d = s.disciplinas.find(d => d.disciplina.id === discId)
      const pct = d?.percentual ?? null
      return { x: PADDING_LEFT + i * xStep, y: pct !== null ? toY(pct) : null }
    })

    let d = ''
    for (const p of pts) {
      if (p.y === null) continue
      d += d === '' ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`
    }
    return d
  }

  const geralPath = (() => {
    let d = ''
    pontos.forEach((s, i) => {
      const x = PADDING_LEFT + i * xStep
      const y = toY(s.percentualGeral)
      d += d === '' ? `M${x},${y}` : ` L${x},${y}`
    })
    return d
  })()

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 600 ${HEIGHT}`} className="w-full" style={{ minWidth: '400px' }}>
          {/* Grade horizontal */}
          {[0, 25, 50, 70, 100].map(pct => (
            <g key={pct}>
              <line
                x1={PADDING_LEFT} y1={toY(pct)}
                x2={600 - PADDING_RIGHT} y2={toY(pct)}
                stroke={pct === 70 ? '#86efac' : pct === 50 ? '#fde68a' : '#e5e7eb'}
                strokeWidth={pct === 70 || pct === 50 ? 1.5 : 1}
                strokeDasharray={pct === 70 || pct === 50 ? '4 3' : undefined}
              />
              <text
                x={PADDING_LEFT - 4} y={toY(pct) + 4}
                textAnchor="end" fontSize="9" fill="#9ca3af"
              >
                {pct}%
              </text>
            </g>
          ))}

          {/* Labels X */}
          {pontos.map((s, i) => (
            <text
              key={s.id}
              x={PADDING_LEFT + i * xStep}
              y={HEIGHT - 4}
              textAnchor="middle"
              fontSize="9"
              fill="#9ca3af"
            >
              {format(new Date(s.dataRealizacao), 'dd/MM', { locale: ptBR })}
            </text>
          ))}

          {/* Linha geral (tracejada cinza) */}
          {geralPath && (
            <path
              d={geralPath}
              fill="none"
              stroke="#6b7280"
              strokeWidth="1.5"
              strokeDasharray="5 3"
              opacity="0.6"
            />
          )}

          {/* Linhas por disciplina */}
          {disciplinasUnicas.map(disc => {
            const path = buildPath(disc.id)
            if (!path) return null
            return (
              <path
                key={disc.id}
                d={path}
                fill="none"
                stroke={disc.cor}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )
          })}

          {/* Pontos */}
          {disciplinasUnicas.map(disc =>
            pontos.map((s, i) => {
              const d = s.disciplinas.find(d => d.disciplina.id === disc.id)
              if (!d) return null
              return (
                <circle
                  key={`${disc.id}-${s.id}`}
                  cx={PADDING_LEFT + i * xStep}
                  cy={toY(d.percentual)}
                  r="3"
                  fill={disc.cor}
                >
                  <title>{disc.nome}: {d.percentual.toFixed(1)}%</title>
                </circle>
              )
            })
          )}
        </svg>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-gray-400" style={{ borderTop: '1.5px dashed #6b7280' }} />
          <span className="text-muted-foreground">Geral</span>
        </div>
        {disciplinasUnicas.map(d => (
          <div key={d.id} className="flex items-center gap-1.5">
            <div className="w-6 h-0.5" style={{ backgroundColor: d.cor }} />
            <span className="text-muted-foreground truncate max-w-[100px]">{d.nome}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
