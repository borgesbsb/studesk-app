"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { CreateConcursoData } from "@/interface/actions/concurso/create"
import { UpdateConcursoData } from "@/interface/actions/concurso/update"

const formSchema = z.object({
  nome: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  orgao: z.string().min(2, "Órgão deve ter no mínimo 2 caracteres"),
  banca: z.string().min(2, "Banca deve ter no mínimo 2 caracteres"),
  cargo: z.string().min(2, "Cargo deve ter no mínimo 2 caracteres"),
  editalUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  imagemUrl: z.string().url("URL inválida").optional().or(z.literal("")),
  dataProva: z.string().optional().or(z.literal("")),
  inicioCurso: z.string().optional().or(z.literal("")),
})

type FormData = z.infer<typeof formSchema>

interface ConcursoFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData: {
    id: string
    nome?: string
    orgao?: string
    banca?: string
    cargo?: string
    editalUrl?: string
    imagemUrl?: string
    dataProva?: string
    inicioCurso?: string
  } | null
  onSubmit: (data: CreateConcursoData | UpdateConcursoData) => Promise<void>
}

export function ConcursoForm({
  open,
  onOpenChange,
  initialData,
  onSubmit,
}: ConcursoFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: initialData?.nome || "",
      orgao: initialData?.orgao || "",
      banca: initialData?.banca || "",
      cargo: initialData?.cargo || "",
      editalUrl: initialData?.editalUrl || "",
      imagemUrl: initialData?.imagemUrl || "",
      dataProva: initialData?.dataProva || "",
      inicioCurso: initialData?.inicioCurso || "",
    },
  })

  const handleSubmit = async (data: FormData) => {
    await onSubmit({
      ...data,
      editalUrl: data.editalUrl || undefined,
      imagemUrl: data.imagemUrl || undefined,
      dataProva: data.dataProva || undefined,
      inicioCurso: data.inicioCurso || undefined,
    })
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Editar Concurso" : "Novo Concurso"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Concurso</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Concurso TJ-SP 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orgao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Órgão</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Tribunal de Justiça de São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="banca"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banca</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: VUNESP" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Analista Judiciário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="editalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Edital</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="https://exemplo.com/edital.pdf" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imagemUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input 
                      type="url" 
                      placeholder="https://exemplo.com/imagem.jpg" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataProva"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Prova</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="inicioCurso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Início do Curso</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  onOpenChange(false)
                }}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {initialData ? "Salvar" : "Criar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 