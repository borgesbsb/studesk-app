"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, Clock } from "lucide-react";

interface AdicionarTempoModalProps {
  disciplinaNome: string;
  onAdicionarTempo: (minutos: number) => void;
}

export function AdicionarTempoModal({ disciplinaNome, onAdicionarTempo }: AdicionarTempoModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [minutos, setMinutos] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setMinutos("");
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const minutosNum = parseInt(minutos) || 0;
    
    if (minutosNum === 0) {
      return;
    }

    setIsLoading(true);
    
    try {
      await onAdicionarTempo(minutosNum);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao adicionar tempo:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalMinutos = parseInt(minutos) || 0;
  const tempoFormatado = totalMinutos > 0 ? `${totalMinutos} minutos` : "";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-400 dark:hover:bg-blue-950/20"
        title="⏱️ Adicionar tempo de estudo"
      >
        <Timer className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="space-y-3 w-full max-w-xs">
                <Label className="text-sm font-medium text-center block">
                  Minutos de estudo
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={minutos}
                  onChange={(e) => setMinutos(e.target.value)}
                  placeholder="0"
                  className="text-center text-2xl font-bold h-16 border-2"
                  autoFocus
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
    </>
  );
}