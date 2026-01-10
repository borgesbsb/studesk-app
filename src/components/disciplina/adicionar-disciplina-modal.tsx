"use client"

import { useState } from "react"
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
import { useToast } from "@/components/ui/use-toast"
import { criarDisciplina } from "@/interface/actions/disciplina/create"

interface AdicionarDisciplinaModalProps {
  onSuccess?: () => void
}

interface FormData {
  nome: string
  descricao: string
  cor: string
}

export function AdicionarDisciplinaModal({ onSuccess }: AdicionarDisciplinaModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await criarDisciplina({
        nome: formData.nome,
        descricao: formData.descricao,
        cor: formData.cor,
      })

      if (response.success) {
        toast({
          title: "Sucesso",
          description: "Disciplina criada com sucesso!",
        })
        setOpen(false)
        setFormData({
          nome: "",
          descricao: "",
          cor: "#3b82f6",
        })
        onSuccess?.()
      } else {
        toast({
          title: "Erro",
          description: response.error || "Erro ao criar disciplina",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar disciplina",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Adicionar Disciplina</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Nova Disciplina</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova disciplina
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="nome" className="text-left sm:text-right">
                Nome
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="descricao" className="text-left sm:text-right">
                Descrição
              </Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="col-span-1 sm:col-span-3"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
              <Label htmlFor="cor" className="text-left sm:text-right">
                Cor
              </Label>
              <div className="col-span-1 sm:col-span-3 flex items-center gap-3">
                <Input
                  id="cor"
                  type="color"
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                  className="w-20 h-10 cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formData.cor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Criar Disciplina</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 