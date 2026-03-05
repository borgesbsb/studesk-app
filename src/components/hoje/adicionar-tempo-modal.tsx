"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer } from "lucide-react";

function formatarTempo(minutos: number): string {
  if (minutos <= 0) return "0min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

interface AdicionarTempoModalProps {
  disciplinaNome: string;
  disciplinaId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (minutos: number) => void;
}

export function AdicionarTempoModal({ disciplinaNome, disciplinaId, isOpen, onClose, onSave }: AdicionarTempoModalProps) {
  const [minutos, setMinutos] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseModal = () => {
    setMinutos("");
    setIsLoading(false);
    onClose();
  };

  const minutosNum = parseInt(minutos) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (minutosNum === 0) return;
    setIsLoading(true);
    try {
      await onSave(minutosNum);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao adicionar tempo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent
        className="max-w-sm w-[320px] p-6"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Adicionar Tempo
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-medium">{disciplinaNome}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Minutos</Label>
            <Input
              type="number"
              min="1"
              value={minutos}
              onChange={(e) => setMinutos(e.target.value)}
              placeholder="0"
              className="text-center text-xl font-bold h-12"
              autoFocus
            />
            {minutosNum > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {formatarTempo(minutosNum)}
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isLoading} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || minutosNum === 0} className="flex-1">
              {isLoading ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
