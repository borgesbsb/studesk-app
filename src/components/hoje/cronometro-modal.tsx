"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Save, Minimize2 } from "lucide-react";
import { useCronometro } from "@/contexts/cronometro-context";
import { useSaveStatus } from "@/contexts/save-status-context";
import { toast } from "sonner";

export function CronometroModal() {
  const { state, pausar, continuar, resetar, fecharModal, salvar } = useCronometro();
  const { setSuccess, setError } = useSaveStatus();
  const [isLoading, setIsLoading] = useState(false);

  const { segundos, rodando, disciplinaNome, modalAberto } = state;

  const handlePlayPause = () => {
    if (rodando) pausar();
    else continuar();
  };

  const handleMinimizar = () => {
    fecharModal();
  };

  const handleSave = async () => {
    if (segundos < 60) return;

    pausar();
    setIsLoading(true);

    try {
      await salvar();
      setSuccess("Tempo do cronômetro adicionado!");
    } catch {
      setError("Erro ao salvar tempo");
    } finally {
      setIsLoading(false);
    }
  };

  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const totalMinutos = Math.floor(segundos / 60);

  return (
    <Dialog open={modalAberto} onOpenChange={(open) => { if (!open) handleMinimizar(); }}>
      <DialogContent
        className="max-w-sm w-[340px] p-6"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-lg">
            Cronômetro
          </DialogTitle>
          <p className="text-sm text-muted-foreground font-medium">
            {disciplinaNome}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Display do tempo */}
          <div className="text-center py-6 px-4 bg-muted/50 rounded-lg">
            <p className="text-5xl font-mono font-bold tracking-wider tabular-nums">
              {pad(h)}:{pad(m)}:{pad(s)}
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={resetar}
              disabled={segundos === 0 || isLoading}
              className="h-12 w-12 rounded-full"
              title="Resetar"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>

            <Button
              size="icon"
              onClick={handlePlayPause}
              disabled={isLoading}
              className={`h-16 w-16 rounded-full text-white ${
                rodando
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {rodando ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="h-7 w-7 ml-0.5" />
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSave}
              disabled={totalMinutos < 1 || isLoading}
              className="h-12 w-12 rounded-full"
              title={totalMinutos < 1 ? "Mínimo 1 minuto para salvar" : "Salvar tempo"}
            >
              <Save className="h-5 w-5" />
            </Button>
          </div>

          {/* Info do tempo a salvar */}
          {totalMinutos >= 1 && (
            <div className="text-center py-2 px-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Será salvo: <span className="font-semibold text-primary">
                  {h > 0 ? `${h}h ` : ""}{m > 0 ? `${m}min` : ""}
                </span>
              </p>
            </div>
          )}

          {/* Botão minimizar */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleMinimizar}
              className="flex-1"
            >
              <Minimize2 className="h-4 w-4 mr-2" />
              Minimizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
