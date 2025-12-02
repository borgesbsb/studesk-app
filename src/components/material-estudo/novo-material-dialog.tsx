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
import { Plus, Loader2, FileText, Video } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { criarMaterialEstudo } from "@/interface/actions/material-estudo/create"

type MaterialTipo = 'PDF' | 'VIDEO'

interface NovoMaterialDialogProps {
    disciplinaId: string
    onSuccess?: () => void
    className?: string
}

export function NovoMaterialDialog({ disciplinaId, onSuccess, className }: NovoMaterialDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [nome, setNome] = useState("")
    const [tipo, setTipo] = useState<MaterialTipo>("PDF")
    const [totalPaginas, setTotalPaginas] = useState(0)
    const [duracaoSegundos, setDuracaoSegundos] = useState(0)

    const resetForm = () => {
        setNome("")
        setTipo("PDF")
        setTotalPaginas(0)
        setDuracaoSegundos(0)
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
                tipo,
                totalPaginas: tipo === 'PDF' ? (totalPaginas || 0) : 0,
                duracaoSegundos: tipo === 'VIDEO' ? (duracaoSegundos || 0) : undefined,
                disciplinaIds: [disciplinaId],
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Material de Estudo</DialogTitle>
                    <DialogDescription>
                        Crie um novo material de estudo. O arquivo poderá ser carregado no momento da visualização.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Seletor de Tipo */}
                    <div className="space-y-2">
                        <Label>Tipo de Material</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setTipo('PDF')}
                                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${tipo === 'PDF'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <FileText className="h-5 w-5" />
                                <span className="font-medium">PDF</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTipo('VIDEO')}
                                className={`flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all ${tipo === 'VIDEO'
                                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                            >
                                <Video className="h-5 w-5" />
                                <span className="font-medium">Vídeo</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="nome">Nome do Material</Label>
                        <Input
                            id="nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            placeholder={tipo === 'PDF' ? "Ex: Apostila de Matemática" : "Ex: Aula 01 - Introdução"}
                            required
                        />
                    </div>

                    {tipo === 'PDF' ? (
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
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="duracao">Duração (em segundos) (Opcional)</Label>
                            <Input
                                id="duracao"
                                type="number"
                                min="0"
                                value={duracaoSegundos}
                                onChange={(e) => setDuracaoSegundos(parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground">
                                Será atualizado automaticamente quando você fizer upload do vídeo.
                            </p>
                        </div>
                    )}

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
