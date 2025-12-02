"use client"

import * as React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings } from 'lucide-react';

interface VideoPlayerProps {
    videoUrl: string;
    tempoProgressoSegundos?: number;
    onTimeUpdate?: (currentTime: number) => void;
}

export default function VideoPlayer({ videoUrl, tempoProgressoSegundos = 0, onTimeUpdate }: VideoPlayerProps) {
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const progressBarRef = React.useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTime, setCurrentTime] = React.useState(0);
    const [duration, setDuration] = React.useState(0);
    const [volume, setVolume] = React.useState(1);
    const [isMuted, setIsMuted] = React.useState(false);
    const [isFullscreen, setIsFullscreen] = React.useState(false);
    const [showControls, setShowControls] = React.useState(true);
    const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
    const [playbackRate, setPlaybackRate] = React.useState(1);
    const [showSpeedMenu, setShowSpeedMenu] = React.useState(false);
    const [isBuffering, setIsBuffering] = React.useState(false);
    const [mounted, setMounted] = React.useState(false);
    const [videoWidth, setVideoWidth] = React.useState(0);
    const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Calcular largura real do vídeo renderizado
    const calculateVideoWidth = () => {
        if (!videoRef.current || !containerRef.current) return;

        const video = videoRef.current;
        const container = containerRef.current;

        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const containerAspectRatio = container.clientWidth / container.clientHeight;

        if (videoAspectRatio > containerAspectRatio) {
            // Vídeo é mais largo - limitado pela largura do container
            setVideoWidth(container.clientWidth);
        } else {
            // Vídeo é mais alto - limitado pela altura do container
            setVideoWidth(container.clientHeight * videoAspectRatio);
        }
    };

    // Atualizar largura quando metadados carregarem ou janela redimensionar
    React.useEffect(() => {
        const handleResize = () => calculateVideoWidth();
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Navegar para tempo de progresso quando vídeo carregar
    React.useEffect(() => {
        if (videoRef.current && tempoProgressoSegundos > 0) {
            videoRef.current.currentTime = tempoProgressoSegundos;
        }
    }, [tempoProgressoSegundos, mounted]);

    // Atualizar tempo atual
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            setCurrentTime(current);

            if (onTimeUpdate) {
                onTimeUpdate(current);
            }
        }
    };

    // Atualizar duração
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            calculateVideoWidth();
        }
    };

    // Buffering handlers
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    // Play/Pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Mute/Unmute
    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    // Ajustar volume
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    // Fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Seek
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = parseFloat(e.target.value);
        setCurrentTime(newTime);
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
        }
    };

    // Skip forward/backward
    const skipForward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
        }
    };

    const skipBackward = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
        }
    };

    // Velocidade de reprodução
    const handleSpeedChange = (speed: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = speed;
            setPlaybackRate(speed);
            setShowSpeedMenu(false);
        }
    };

    // Formatar tempo
    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-hide controls
    const resetControlsTimeout = () => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }

        setShowControls(true);

        if (isPlaying) {
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    };

    const handleMouseMove = () => {
        resetControlsTimeout();
    };

    if (!mounted) return null;

    const speedOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full bg-black flex items-center justify-center group cursor-default"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            {/* Vídeo */}
            <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onClick={togglePlay}
            />

            {/* Loading Spinner */}
            {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Play button overlay gigante (quando pausado) */}
            {!isPlaying && !isBuffering && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 backdrop-blur-sm transition-all duration-300"
                    onClick={togglePlay}
                >
                    <div className="relative group/play">
                        <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-2xl group-hover/play:bg-blue-600/30 transition-all" />
                        <div className="relative rounded-full bg-white/10 backdrop-blur-md p-8 border border-white/20 shadow-2xl group-hover/play:scale-110 group-hover/play:bg-white/20 transition-all duration-300">
                            <Play className="h-20 w-20 text-white fill-white drop-shadow-2xl" />
                        </div>
                    </div>
                </div>
            )}

            {/* Controles modernos */}
            <div
                className={`absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-t from-black via-black/80 to-transparent transition-all duration-300 ${
                    showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                }`}
                style={{
                    width: videoWidth > 0 ? `${videoWidth}px` : '100%',
                }}
            >
                {/* Timeline aprimorada */}
                <div className="px-6 pt-6 pb-2">
                    <div
                        ref={progressBarRef}
                        className="group/timeline relative h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2 transition-all"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pos = (e.clientX - rect.left) / rect.width;
                            const newTime = pos * duration;
                            if (videoRef.current) {
                                videoRef.current.currentTime = newTime;
                            }
                        }}
                    >
                        {/* Barra de progresso */}
                        <div
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        >
                            {/* Bolinha indicadora */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/timeline:opacity-100 transition-opacity" />
                        </div>
                    </div>

                    {/* Tempos */}
                    <div className="flex justify-between items-center mt-2 text-xs font-medium text-white/90">
                        <span className="tabular-nums">{formatTime(currentTime)}</span>
                        <span className="tabular-nums text-white/60">-{formatTime(duration - currentTime)}</span>
                    </div>
                </div>

                {/* Controles */}
                <div className="px-4 pb-4 pt-2">
                    <div className="flex items-center justify-between gap-4">
                        {/* ESQUERDA: Controles de reprodução + Volume */}
                        <div className="flex items-center gap-3">
                            {/* Play/Pause - Maior e destacado */}
                            <button
                                onClick={togglePlay}
                                className="p-3 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white bg-white/5"
                                title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
                            >
                                {isPlaying ? (
                                    <Pause className="h-6 w-6" />
                                ) : (
                                    <Play className="h-6 w-6 fill-current" />
                                )}
                            </button>

                            {/* Skip Backward */}
                            <button
                                onClick={skipBackward}
                                className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
                                title="Voltar 10s"
                            >
                                <SkipBack className="h-5 w-5" />
                            </button>

                            {/* Skip Forward */}
                            <button
                                onClick={skipForward}
                                className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
                                title="Avançar 10s"
                            >
                                <SkipForward className="h-5 w-5" />
                            </button>

                            {/* Volume */}
                            <div
                                className="flex items-center gap-2 group/volume"
                                onMouseEnter={() => setShowVolumeSlider(true)}
                                onMouseLeave={() => setShowVolumeSlider(false)}
                            >
                                <button
                                    onClick={toggleMute}
                                    className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
                                    title={isMuted ? 'Ativar som' : 'Silenciar'}
                                >
                                    {isMuted || volume === 0 ? (
                                        <VolumeX className="h-5 w-5" />
                                    ) : (
                                        <Volume2 className="h-5 w-5" />
                                    )}
                                </button>

                                {/* Slider de volume */}
                                <div className={`overflow-hidden transition-all duration-200 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                                    <input
                                        type="range"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg"
                                        style={{
                                            background: `linear-gradient(to right, white 0%, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%, rgba(255,255,255,0.2) 100%)`
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Tempo */}
                            <div className="text-xs font-medium text-white/80 tabular-nums ml-1">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </div>
                        </div>

                        {/* DIREITA: Velocidade + Fullscreen */}
                        <div className="flex items-center gap-2">
                            {/* Velocidade */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                    className="px-2.5 py-1.5 rounded-md hover:bg-white/10 active:scale-95 transition-all text-xs font-medium text-white/80 hover:text-white flex items-center gap-1"
                                    title="Velocidade de reprodução"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    <span className="tabular-nums">{playbackRate}x</span>
                                </button>

                                {/* Menu de velocidade */}
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[120px]">
                                        <div className="p-1.5 space-y-0.5">
                                            {speedOptions.map((speed) => (
                                                <button
                                                    key={speed}
                                                    onClick={() => handleSpeedChange(speed)}
                                                    className={`w-full px-3 py-1.5 text-left rounded-md text-xs transition-colors ${
                                                        playbackRate === speed
                                                            ? 'bg-blue-600 text-white font-medium'
                                                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                                                    }`}
                                                >
                                                    {speed === 1 ? 'Normal' : `${speed}x`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fullscreen */}
                            <button
                                onClick={toggleFullscreen}
                                className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/80 hover:text-white"
                                title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                            >
                                {isFullscreen ? (
                                    <Minimize className="h-5 w-5" />
                                ) : (
                                    <Maximize className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
