"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { criarEdital } from "@/interface/actions/edital/create"
import { atualizarEdital } from "@/interface/actions/edital/update"
import { Edital } from "@/domain/entities/Edital"
import { Plus } from "lucide-react"

interface EditalModalProps {
  edital?: Edital
  onSuccess?: () => void
  trigger?: React.ReactNode
}

interface FormData {
  nome: string
  descricao: string
  orgao: string
  cargo: string
  ano: string
  link: string
}

const emptyForm: FormData = {
  nome: "",
  descricao: "",
  orgao: "",
  cargo: "",
  ano: "",
  link: "",
}

export function EditalModal({ edital, onSuccess, trigger }: EditalModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>(emptyForm)

  const isEditing = !!edital

  useEffect(() => {
    if (open && edital) {
      setFormData({
        nome: edital.nome,
        descricao: edital.descricao || "",
        orgao: edital.orgao || "",
        cargo: edital.cargo || "",
        ano: edital.ano ? String(edital.ano) : "",
        link: edital.link || "",
      })
    } else if (!open) {
      setFormData(emptyForm)
    }
  }, [open, edital])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      const payload = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        orgao: formData.orgao.trim() || undefined,
        cargo: formData.cargo.trim() || undefined,
        ano: formData.ano ? parseInt(formData.ano) : undefined,
        link: formData.link.trim() || undefined,
      }

      const response = isEditing
        ? await atualizarEdital(edital.id, payload)
        : await criarEdital(payload)

      if (response.success) {
        toast({
          title: "Sucesso",
          description: isEditing ? "Edital atualizado com sucesso!" : "Edital criado com sucesso!",
        })
        setOpen(false)
        onSuccess?.()
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao salvar edital",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar edital",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const field = (id: keyof FormData, label: string, element: React.ReactNode) => (
    <div className="grid grid-cols-1 sm:grid-cols-4 items-start gap-2">
      <Label htmlFor={id} className="sm:text-right sm:pt-2">{label}</Label>
      <div className="sm:col-span-3">{element}</div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Edital
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Edital" : "Novo Edital"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Atualize os dados do edital" : "Preencha os dados do edital"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {field("nome", "Nome *", (
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: TJSP 2025"
              />
            ))}
            {field("orgao", "Órgão", (
              <Input
                id="orgao"
                value={formData.orgao}
                onChange={(e) => setFormData({ ...formData, orgao: e.target.value })}
                placeholder="Ex: CESPE / Cebraspe"
              />
            ))}
            {field("cargo", "Cargo", (
              <Input
                id="cargo"
                value={formData.cargo}
                onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                placeholder="Ex: Analista Judiciário"
              />
            ))}
            {field("ano", "Ano", (
              <Input
                id="ano"
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                placeholder="Ex: 2025"
                min={2000}
                max={2099}
              />
            ))}
            {field("link", "Link", (
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="URL do edital oficial"
              />
            ))}
            {field("descricao", "Descrição", (
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Observações sobre o edital..."
                rows={3}
              />
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Criar Edital"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
