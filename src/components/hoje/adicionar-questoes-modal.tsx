"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList } from "lucide-react";

interface AdicionarQuestoesModalProps {
  disciplinaNome: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (quantidade: number) => void;
}

export function AdicionarQuestoesModal({ disciplinaNome, isOpen, onClose, onSave }: AdicionarQuestoesModalProps) {
  const [quantidade, setQuantidade] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseModal = () => {
    setQuantidade("");
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const quantidadeNum = parseInt(quantidade) || 0;

    if (quantidadeNum === 0) {
      return;
    }

    setIsLoading(true);

    try {
      await onSave(quantidadeNum);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao adicionar questões:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuestoes = parseInt(quantidade) || 0;
  const textoQuestoes = totalQuestoes > 0
    ? `${totalQuestoes} ${totalQuestoes !== 1 ? 'questões' : 'questão'}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent
        className="max-w-sm w-[340px] p-6"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-green-600 dark:text-green-400" />
            Adicionar Questões
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-medium">
            {disciplinaNome}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="space-y-3 w-full max-w-xs">
              <Label className="text-sm font-medium text-center block">
                Quantidade de questões
              </Label>
              <Input
                type="number"
                min="1"
                max="9999"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                className="text-center text-2xl font-bold h-16 border-2"
                autoFocus
              />
            </div>
          </div>

          {textoQuestoes && (
            <div className="text-center py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-lg font-semibold text-primary">{textoQuestoes}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || totalQuestoes === 0}
              className="flex-1"
            >
              {isLoading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
