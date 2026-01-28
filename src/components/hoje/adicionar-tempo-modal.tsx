"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, Clock } from "lucide-react";

interface AdicionarTempoModalProps {
  disciplinaNome: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (horas: number, minutos: number) => void;
}

export function AdicionarTempoModal({ disciplinaNome, isOpen, onClose, onSave }: AdicionarTempoModalProps) {
  const [horas, setHoras] = useState("");
  const [minutos, setMinutos] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCloseModal = () => {
    setHoras("");
    setMinutos("");
    setIsLoading(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const horasNum = parseInt(horas) || 0;
    const minutosNum = parseInt(minutos) || 0;

    if (horasNum === 0 && minutosNum === 0) {
      return;
    }

    setIsLoading(true);

    try {
      await onSave(horasNum, minutosNum);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao adicionar tempo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const horasNum = parseInt(horas) || 0;
  const minutosNum = parseInt(minutos) || 0;
  const totalMinutos = horasNum * 60 + minutosNum;
  const tempoFormatado = totalMinutos > 0
    ? `${horasNum > 0 ? horasNum + 'h' : ''} ${minutosNum > 0 ? minutosNum + 'min' : ''}`.trim()
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent 
          className="max-w-sm w-[340px] p-6"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="flex items-center justify-center gap-2 text-lg">
              <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Adicionar Tempo
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-medium">
              {disciplinaNome}
            </p>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">Horas</Label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={horas}
                  onChange={(e) => setHoras(e.target.value)}
                  placeholder="0"
                  className="text-center text-xl font-bold h-12"
                  autoFocus
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-sm font-medium">Minutos</Label>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  placeholder="0"
                  className="text-center text-xl font-bold h-12"
                />
              </div>
            </div>
            
            {tempoFormatado && (
              <div className="text-center py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-lg font-semibold text-primary">{tempoFormatado}</p>
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
                disabled={isLoading || totalMinutos === 0}
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