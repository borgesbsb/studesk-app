"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HardDrive, Cloud } from "lucide-react"

interface PdfSourceDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectSource: (source: 'local' | 'drive') => void
    materialNome?: string
}

export function PdfSourceDialog({
    open,
    onOpenChange,
    onSelectSource,
    materialNome
}: PdfSourceDialogProps) {
    const handleSelectLocal = () => {
        onSelectSource('local')
        onOpenChange(false)
    }

    const handleSelectDrive = () => {
        onSelectSource('drive')
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Escolha a fonte do material</DialogTitle>
                    <DialogDescription>
                        {materialNome ? `Como deseja abrir "${materialNome}"?` : 'Como deseja adicionar este material?'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 py-4">
                    {/* Opção: Disco Local */}
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-blue-50 hover:border-blue-300 transition-all"
                        onClick={handleSelectLocal}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
                                <HardDrive className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-semibold text-sm text-gray-900">Disco Local</div>
                                <div className="text-xs text-gray-500">Upload de PDF ou vídeo do seu computador</div>
                            </div>
                        </div>
                    </Button>

                    {/* Opção: Google Drive */}
                    <Button
                        variant="outline"
                        className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-green-50 hover:border-green-300 transition-all"
                        onClick={handleSelectDrive}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100">
                                <Cloud className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 text-left">
                                <div className="font-semibold text-sm text-gray-900">Google Drive</div>
                                <div className="text-xs text-gray-500">Abrir PDF do Google Drive</div>
                            </div>
                            {/* Badge "Em breve" */}
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                                Em breve
                            </span>
                        </div>
                    </Button>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        Cancelar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
