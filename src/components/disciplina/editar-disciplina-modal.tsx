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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { atualizarDisciplina } from "@/interface/actions/disciplina/update"

interface EditarDisciplinaModalProps {
  disciplina: {
    id: string
    nome: string
    descricao?: string | null
    cor?: string | null
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface FormData {
  nome: string
  descricao: string
  cor: string
}

export function EditarDisciplinaModal({ disciplina, open, onOpenChange, onSuccess }: EditarDisciplinaModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
  })

  // Atualizar form quando disciplina mudar
  useEffect(() => {
    if (disciplina) {
      setFormData({
        nome: disciplina.nome || "",
        descricao: disciplina.descricao || "",
        cor: disciplina.cor || "#3b82f6",
      })
    }
  }, [disciplina])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!disciplina) return

    try {
      const response = await atualizarDisciplina(disciplina.id, {
        nome: formData.nome,
        descricao: formData.descricao,
        cor: formData.cor,
      })

      if (response.success) {
        toast({
          title: "Sucesso",
          description: "Disciplina atualizada com sucesso!",
        })
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao atualizar disciplina",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar disciplina",
        variant: "destructive",
      })
    }
  }

  if (!disciplina) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Disciplina</DialogTitle>
            <DialogDescription>
              Atualize as informações da disciplina
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="edit-nome" className="text-left sm:text-right">
                Nome
              </Label>
              <Input
                id="edit-nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="col-span-1 sm:col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="edit-descricao" className="text-left sm:text-right">
                Descrição
              </Label>
              <Input
                id="edit-descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="edit-cor" className="text-left sm:text-right">
                Cor
              </Label>
              <div className="col-span-1 sm:col-span-3 flex items-center gap-3">
                <Input
                  id="edit-cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formData.cor}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">Salvar Alterações</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
