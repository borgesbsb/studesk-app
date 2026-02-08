"use client";

import { useRef, useEffect, useCallback } from "react";
import { useCronometro } from "@/contexts/cronometro-context";
import { Play, Pause, X, PictureInPicture2 } from "lucide-react";
import { toast } from "sonner";

export function CronometroFlutuante() {
  const { state, pausar, continuar, abrirModal, resetar, isAtivo } = useCronometro();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipAtivo = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const { segundos, rodando, disciplinaNome, modalAberto } = state;

  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Desenhar no canvas a cada segundo
  useEffect(() => {
    if (!isAtivo || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fundo
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Indicador de status
    ctx.beginPath();
    ctx.arc(30, 35, 8, 0, Math.PI * 2);
    ctx.fillStyle = rodando ? "#22c55e" : "#eab308";
    ctx.fill();

    // Disciplina
    ctx.fillStyle = "#94a3b8";
    ctx.font = "18px sans-serif";
    ctx.textAlign = "left";
    const nome = (disciplinaNome || "").slice(0, 30);
    ctx.fillText(nome, 50, 42);

    // Timer
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${pad(h)}:${pad(m)}:${pad(s)}`, canvas.width / 2, 105);

    // Status text
    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      rodando ? "Rodando" : "Pausado",
      canvas.width / 2,
      130
    );
  }, [segundos, rodando, disciplinaNome, isAtivo, h, m, s]);

  // Limpar PiP ao desativar cronômetro
  useEffect(() => {
    if (!isAtivo && pipAtivo.current) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
      pipAtivo.current = false;
    }
  }, [isAtivo]);

  const entrarPiP = useCallback(async () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    try {
      // Criar stream do canvas
      if (!streamRef.current) {
        streamRef.current = canvas.captureStream(2);
      }
      video.srcObject = streamRef.current;
      await video.play();
      await video.requestPictureInPicture();
      pipAtivo.current = true;
    } catch (err) {
      console.error("Erro ao entrar em PiP:", err);
      toast.error("Não foi possível abrir Picture-in-Picture");
    }
  }, []);

  // Listener para quando sair do PiP
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLeavePiP = () => {
      pipAtivo.current = false;
      if (video.srcObject) {
        video.pause();
      }
    };

    video.addEventListener("leavepictureinpicture", handleLeavePiP);
    return () => video.removeEventListener("leavepictureinpicture", handleLeavePiP);
  }, []);

  if (!isAtivo) return null;

  // Canvas e video sempre renderizados (para PiP funcionar mesmo com modal aberto)
  const hiddenElements = (
    <>
      <canvas ref={canvasRef} width={400} height={140} className="hidden" />
      <video ref={videoRef} muted playsInline className="hidden" />
    </>
  );

  // Se modal aberto, só renderizar os elementos ocultos
  if (modalAberto) return hiddenElements;

  const handleDescartar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    streamRef.current = null;
    resetar();
    toast.info("Cronômetro descartado");
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rodando) pausar();
    else continuar();
  };

  const handlePiP = (e: React.MouseEvent) => {
    e.stopPropagation();
    entrarPiP();
  };

  return (
    <>
      {hiddenElements}
      <div
        onClick={abrirModal}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-card border border-primary/20 rounded-full shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      >
        {/* Indicador pulsante */}
        {rodando && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
        )}

        {/* Disciplina */}
        <span className="text-xs font-medium text-muted-foreground max-w-[120px] truncate">
          {disciplinaNome}
        </span>

        {/* Tempo */}
        <span className="text-sm font-mono font-bold tabular-nums">
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>

        {/* PiP */}
        <button
          onClick={handlePiP}
          className="p-1.5 rounded-full hover:bg-muted text-muted-foreground"
          title="Flutuar sobre outras janelas"
        >
          <PictureInPicture2 className="h-3.5 w-3.5" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className={`p-1.5 rounded-full text-white ${
            rodando ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {rodando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>

        {/* Fechar */}
        <button
          onClick={handleDescartar}
          className="p-1 rounded-full hover:bg-muted text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </>
  );
}
