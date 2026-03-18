"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Share2 } from "lucide-react"
import { ResumoCompartilhar } from "@/interface/actions/dashboard/get-resumo-compartilhar"

interface ResumoCompartilharCardProps {
  resumo: ResumoCompartilhar | null
}

function formatarHoras(horas: number) {
  if (horas === 0) return "0"
  const h = Math.floor(horas)
  const m = Math.round((horas - h) * 60)
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h${m}m`
}

function formatarMinutos(minutos: number) {
  if (minutos === 0) return ""
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (m === 0) return `${h}h`
  if (h === 0) return `${m}min`
  return `${h}h${m}m`
}

export function ResumoCompartilharCard({ resumo }: ResumoCompartilharCardProps) {
  const [atividadeFisica, setAtividadeFisica] = useState(0)
  const [copiado, setCopiado] = useState(false)

  if (!resumo) return null

  const gerarTexto = () => {
    const hoje = new Date()
    const data = hoje.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    const dataCapitalizada = data.charAt(0).toUpperCase() + data.slice(1)

    const disciplinasHoje = resumo.hoje.disciplinas.length > 0
      ? resumo.hoje.disciplinas
          .map((d, i) => {
            const isLast = i === resumo.hoje.disciplinas.length - 1
            const tempo = d.minutosPlanejados > 0 ? ` — *${formatarMinutos(d.minutosPlanejados)}*` : ""
            const prefixo = isLast ? "┗" : "┣"
            return `${prefixo} 📌 ${d.nome}${tempo}`
          })
          .join("\n")
      : "┗ Nenhuma disciplina"

    const linhas = [
      `📊 *RELATÓRIO DE ESTUDOS*`,
      `📅 ${dataCapitalizada}`,
      ...(resumo.nomePlano ? [`📋 ${resumo.nomePlano}`] : []),
      ``,
      `━━━━━━━━━━━━━━━━━`,
      `⏰ *ONTEM*`,
      `┣ 🏃 Atividade física: *${atividadeFisica}h*`,
      `┗ 📖 Estudos: *${formatarHoras(resumo.ontem.horasEstudo)}*`,
      ``,
      `━━━━━━━━━━━━━━━━━`,
      `📚 *PLANEJAMENTO DE HOJE*`,
      disciplinasHoje,
      ``,
      `#estudos #concurso`,
    ]

    return linhas.join("\n")
  }

  const copiar = async () => {
    await navigator.clipboard.writeText(gerarTexto())
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <Card className="bg-card border-primary/15">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="flex items-center gap-2 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          Resumo para Compartilhar
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Ativ. física ontem:</span>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={atividadeFisica}
            onChange={e => setAtividadeFisica(Number(e.target.value))}
            className="h-6 text-xs w-16 px-2"
          />
          <span className="text-[11px] text-muted-foreground">h</span>
        </div>
        <pre className="text-[10px] leading-relaxed bg-muted/50 rounded p-2 whitespace-pre-wrap font-sans">
          {gerarTexto()}
        </pre>
        <Button size="sm" variant="outline" className="h-6 text-xs w-full" onClick={copiar}>
          {copiado ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copiado ? "Copiado!" : "Copiar"}
        </Button>
      </CardContent>
    </Card>
  )
}
