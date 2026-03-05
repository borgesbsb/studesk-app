'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

interface YouTubePlayerProps {
  videoId: string
  materialId: string
  startTimeSeconds?: number
  onPlayStateChange: (playing: boolean) => void
  onTimeUpdate: (seconds: number) => void
  onDurationLoad?: (seconds: number) => void
}

export function YouTubePlayer({
  videoId,
  materialId,
  startTimeSeconds = 0,
  onPlayStateChange,
  onTimeUpdate,
  onDurationLoad,
}: YouTubePlayerProps) {
  const playerRef = useRef<any>(null)
  const tickRef = useRef<NodeJS.Timeout | null>(null)
  const divId = `yt-player-${materialId}`

  // Refs para callbacks — evitam recriar o player quando o pai re-renderiza
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onDurationLoadRef = useRef(onDurationLoad)
  useEffect(() => { onPlayStateChangeRef.current = onPlayStateChange }, [onPlayStateChange])
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate }, [onTimeUpdate])
  useEffect(() => { onDurationLoadRef.current = onDurationLoad }, [onDurationLoad])

  useEffect(() => {
    let destroyed = false

    const stopTick = () => {
      if (tickRef.current) {
        clearInterval(tickRef.current)
        tickRef.current = null
      }
    }

    const startTick = () => {
      stopTick()
      tickRef.current = setInterval(() => {
        const t = playerRef.current?.getCurrentTime?.()
        if (typeof t === 'number') onTimeUpdateRef.current(Math.floor(t))
      }, 1000)
    }

    const createPlayer = () => {
      if (destroyed || !window.YT?.Player) return
      if (playerRef.current) return

      playerRef.current = new window.YT.Player(divId, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          start: startTimeSeconds > 0 ? startTimeSeconds : undefined,
        },
        events: {
          onReady: () => {
            const duration = playerRef.current?.getDuration?.()
            if (typeof duration === 'number' && duration > 0) {
              onDurationLoadRef.current?.(Math.floor(duration))
            }
          },
          onStateChange: (event: any) => {
            const playing = event.data === window.YT.PlayerState.PLAYING
            onPlayStateChangeRef.current(playing)
            if (playing) {
              // Capturar duração na primeira reprodução (pode não estar disponível no onReady)
              const duration = playerRef.current?.getDuration?.()
              if (typeof duration === 'number' && duration > 0) {
                onDurationLoadRef.current?.(Math.floor(duration))
              }
              startTick()
            } else {
              stopTick()
              const t = playerRef.current?.getCurrentTime?.()
              if (typeof t === 'number') onTimeUpdateRef.current(Math.floor(t))
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
      createPlayer()
    } else {
      if (!document.getElementById('youtube-iframe-api')) {
        const script = document.createElement('script')
        script.id = 'youtube-iframe-api'
        script.src = 'https://www.youtube.com/iframe_api'
        document.head.appendChild(script)
      }
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        prev?.()
        createPlayer()
      }
    }

    return () => {
      destroyed = true
      stopTick()
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
    }
  // Apenas inicializa uma vez — videoId e startTimeSeconds são estáveis
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, materialId, startTimeSeconds])

  return (
    <div className="w-full h-full bg-black">
      <div id={divId} className="w-full h-full" />
    </div>
  )
}
