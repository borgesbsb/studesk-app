"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, BookOpen } from "lucide-react";

interface AdicionarQuestoesModalProps {
  disciplinaNome: string;
  onAdicionarQuestoes: (questoes: number) => void;
}

export function AdicionarQuestoesModal({ disciplinaNome, onAdicionarQuestoes }: AdicionarQuestoesModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [questoes, setQuestoes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    setQuestoes("");
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const questoesNum = parseInt(questoes) || 0;
    
    if (questoesNum === 0) {
      return;
    }

    setIsLoading(true);
    
    try {
      await onAdicionarQuestoes(questoesNum);
      handleCloseModal();
    } catch (error) {
      console.error("Erro ao adicionar questões:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuestoes = parseInt(questoes) || 0;
  const questoesFormatado = totalQuestoes > 0 ? `${totalQuestoes} questões` : "";

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpenModal}
        className="h-8 w-8 p-0 border-dashed hover:border-solid"
        title="Adicionar questões resolvidas"
      >
        <BookOpen className="h-4 w-4" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent 
          className="max-w-sm w-[340px] p-6"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="flex items-center justify-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
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
                  Questões resolvidas
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="999"
                  value={questoes}
                  onChange={(e) => setQuestoes(e.target.value)}
                  placeholder="0"
                  className="text-center text-2xl font-bold h-16 border-2"
                  autoFocus
                />
              </div>
            </div>
            
            {questoesFormatado && (
              <div className="text-center py-3 px-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-lg font-semibold text-primary">{questoesFormatado}</p>
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
    </>
  );
}