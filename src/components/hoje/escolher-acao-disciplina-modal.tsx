"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timer, BookOpen } from "lucide-react";
import { useUserHash } from "@/contexts/user-hash-context";
import { useRouter } from "next/navigation";

interface EscolherAcaoDisciplinaModalProps {
  disciplinaNome: string;
  disciplinaId: string;
  isOpen: boolean;
  onClose: () => void;
  onEscolherAdicionarTempo: () => void;
}

export function EscolherAcaoDisciplinaModal({
  disciplinaNome,
  disciplinaId,
  isOpen,
  onClose,
  onEscolherAdicionarTempo
}: EscolherAcaoDisciplinaModalProps) {
  const { hash } = useUserHash();
  const router = useRouter();
  const [loadingMateriais, setLoadingMateriais] = useState(false);

  const handleCloseModal = () => {
    onClose();
  };

  const handleContinuarEstudando = () => {
    console.log('🔵 [MODAL] Navegando para materiais da disciplina:', disciplinaId);
    setLoadingMateriais(true);
    handleCloseModal();
    router.push(`/${hash}/disciplina/${disciplinaId}/materiais`);
  };

  const handleAdicionarTempo = () => {
    onEscolherAdicionarTempo();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCloseModal()}>
      <DialogContent
        className="max-w-md w-[440px] p-6"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {disciplinaNome}
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-medium">
            O que deseja fazer?
          </p>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleAdicionarTempo}
            className="w-full h-auto py-4 flex items-center gap-3 justify-start"
            variant="outline"
          >
            <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <p className="font-semibold text-base">Adicionar Tempo Manual</p>
              <p className="text-xs text-muted-foreground">Registrar tempo de estudo</p>
            </div>
          </Button>

          <Button
            onClick={handleContinuarEstudando}
            disabled={loadingMateriais}
            className="w-full h-auto py-4 flex items-center gap-3 justify-start"
            variant="outline"
          >
            <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="text-left">
              <p className="font-semibold text-base">
                {loadingMateriais ? "Carregando..." : "Continuar Estudando"}
              </p>
              <p className="text-xs text-muted-foreground">Ver materiais da disciplina</p>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
