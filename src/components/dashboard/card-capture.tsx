"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { Camera, Check, Download } from "lucide-react"
import { toast } from "sonner"

interface CardCaptureProps {
  children: React.ReactNode
  filename?: string
  className?: string
}

export function CardCapture({ children, filename = "card", className }: CardCaptureProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"idle" | "capturing" | "done">("idle")

  const capture = async () => {
    if (!ref.current || status === "capturing") return
    setStatus("capturing")
    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 })

      // Tenta copiar para clipboard
      try {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        toast.success("Imagem copiada para a área de transferência!")
      } catch {
        // Fallback: download direto
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `${filename}.png`
        a.click()
        toast.success("Imagem salva!")
      }

      setStatus("done")
      setTimeout(() => setStatus("idle"), 2000)
    } catch {
      toast.error("Erro ao capturar o card")
      setStatus("idle")
    }
  }

  return (
    <div ref={ref} className={`relative group ${className ?? ""}`}>
      {children}
      <button
        onClick={capture}
        disabled={status === "capturing"}
        title="Capturar imagem"
        className="
          absolute top-2 right-2 z-10
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          bg-background/80 backdrop-blur-sm border border-border
          rounded-md p-1 shadow-sm
          hover:bg-muted
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        {status === "done"
          ? <Check className="h-3.5 w-3.5 text-green-500" />
          : status === "capturing"
          ? <Download className="h-3.5 w-3.5 animate-pulse text-muted-foreground" />
          : <Camera className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>
    </div>
  )
}
