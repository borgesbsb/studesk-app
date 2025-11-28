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
  cargaHoraria: number
  peso: number
}

export function AdicionarDisciplinaModal({ onSuccess }: AdicionarDisciplinaModalProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    descricao: "",
    cargaHoraria: 0,
    peso: 1,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await criarDisciplina({
        nome: formData.nome,
        descricao: formData.descricao,
        cargaHoraria: formData.cargaHoraria,
        peso: formData.peso,
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
          cargaHoraria: 0,
          peso: 1,
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
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Criar Nova Disciplina</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova disciplina
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome" className="text-right">
                Nome
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="descricao" className="text-right">
                Descrição
              </Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargaHoraria" className="text-right">
                Carga Horária
              </Label>
              <Input
                id="cargaHoraria"
                type="number"
                value={formData.cargaHoraria}
                onChange={(e) => setFormData({ ...formData, cargaHoraria: Number(e.target.value) })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="peso" className="text-right">
                Peso
              </Label>
              <Input
                id="peso"
                type="number"
                value={formData.peso}
                onChange={(e) => setFormData({ ...formData, peso: Number(e.target.value) })}
                className="col-span-3"
              />
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