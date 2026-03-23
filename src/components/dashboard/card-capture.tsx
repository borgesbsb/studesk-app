"use client"

import { useRef, useState } from "react"
import { flushSync } from "react-dom"
import { toPng } from "html-to-image"
import { Camera, Check, Download } from "lucide-react"
import { toast } from "sonner"

interface CardCaptureProps {
  children: React.ReactNode
  filename?: string
  className?: string
}

async function fetchLogoBase64(): Promise<string> {
  try {
    const res = await fetch("/logo-mvt.png")
    const blob = await res.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return ""
  }
}

export function CardCapture({ children, filename = "card", className }: CardCaptureProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"idle" | "capturing" | "done">("idle")
  const [logoBase64, setLogoBase64] = useState<string>("")

  const capture = async () => {
    if (!ref.current || status === "capturing") return

    // Busca a logo como base64 (garante que html-to-image consegue embedar)
    const logo = await fetchLogoBase64()

    flushSync(() => {
      setLogoBase64(logo)
      setStatus("capturing")
    })

    // Aguarda 2 frames para o browser pintar com a logo
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    // Expande temporariamente containers com scroll para capturar conteúdo completo
    type ScrollOverride = { el: HTMLElement; overflowX: string; width: string; maxWidth: string }
    const overrides: ScrollOverride[] = []

    // 1. Expande scroll containers internos
    ref.current.querySelectorAll<HTMLElement>('*').forEach(el => {
      const computed = window.getComputedStyle(el)
      if (computed.overflowX === 'auto' || computed.overflowX === 'scroll') {
        overrides.push({ el, overflowX: el.style.overflowX, width: el.style.width, maxWidth: el.style.maxWidth })
        el.style.overflowX = 'visible'
        el.style.width = el.scrollWidth + 'px'
        el.style.maxWidth = 'none'
      }
    })

    // 2. Expande o próprio ref para caber o conteúdo completo
    const fullWidth = Math.max(ref.current.scrollWidth, ref.current.offsetWidth)
    const refOrigWidth = ref.current.style.width
    const refOrigMaxWidth = ref.current.style.maxWidth
    if (fullWidth > ref.current.offsetWidth) {
      ref.current.style.width = fullWidth + 'px'
      ref.current.style.maxWidth = 'none'
    }

    try {
      const dataUrl = await toPng(ref.current, { cacheBust: true, pixelRatio: 2 })

      try {
        const res = await fetch(dataUrl)
        const blob = await res.blob()
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
        toast.success("Imagem copiada para a área de transferência!")
      } catch {
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
    } finally {
      // Restaura overflow dos containers internos
      overrides.forEach(({ el, overflowX, width, maxWidth }) => {
        el.style.overflowX = overflowX
        el.style.width = width
        el.style.maxWidth = maxWidth
      })
      // Restaura o ref
      ref.current!.style.width = refOrigWidth
      ref.current!.style.maxWidth = refOrigMaxWidth
    }
  }

  return (
    <div className={`relative group ${className ?? ""}`}>
      <div ref={ref} className="h-full flex flex-col">
        {status === "capturing" && logoBase64 && (
          <div className="flex items-center justify-center py-1.5 px-3 border-b border-border/40 bg-card flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoBase64} alt="Logo" width={90} style={{ objectFit: "contain" }} />
          </div>
        )}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </div>
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
