"use client"

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
import { Plus, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { criarMaterialEstudo } from "@/interface/actions/material-estudo/create"

interface NovoMaterialDialogProps {
    disciplinaId: string
    onSuccess?: () => void
    className?: string
}

export function NovoMaterialDialog({ disciplinaId, onSuccess, className }: NovoMaterialDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nome, setNome] = useState("")
    const [totalPaginas, setTotalPaginas] = useState(0)

    const resetForm = () => {
        setNome("")
        setTotalPaginas(0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!nome.trim()) {
            toast.error("O nome do material é obrigatório")
            return
        }

        setLoading(true)

        try {
            const response = await criarMaterialEstudo({
                nome,
                totalPaginas: totalPaginas || 0, // Opcional, pode ser atualizado depois ao abrir o PDF
                disciplinaIds: [disciplinaId],
                // arquivoPdfUrl não é enviado, será null no banco
            })

            if (response.success) {
                toast.success("Material adicionado com sucesso!")
                setOpen(false)
                resetForm()
                onSuccess?.()
            } else {
                toast.error(response.error || "Erro ao adicionar material")
            }
        } catch (error) {
            console.error('Erro ao processar:', error)
            toast.error(error instanceof Error ? error.message : "Erro ao adicionar material")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(newOpen) => {
            setOpen(newOpen)
            if (!newOpen) resetForm()
        }}>
            <DialogTrigger asChild>
                <Button className={className}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Material
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Material de Estudo</DialogTitle>
                    <DialogDescription>
                        Crie um novo material para acompanhar seus estudos. O arquivo PDF poderá ser carregado no momento da leitura.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome do Material</Label>
                        <Input
                            id="nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Apostila de Matemática"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="paginas">Total de Páginas (Opcional)</Label>
                        <Input
                            id="paginas"
                            type="number"
                            min="0"
                            value={totalPaginas}
                            onChange={(e) => setTotalPaginas(parseInt(e.target.value) || 0)}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground">
                            Será atualizado automaticamente quando você abrir o PDF.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            type="button"
                            onClick={() => setOpen(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Criar Material
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
