import { useEffect, useState, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

export interface TTSOptions {
  text: string
  rate?: number
  pitch?: number
  volume?: number
  voice?: string
  lang?: string
}

export interface TTSControls {
  speak: (options: TTSOptions) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  stop: () => Promise<void>
  isSpeaking: boolean
  isPaused: boolean
  isNative: boolean
}

export function useTextToSpeech(): TTSControls {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isNative] = useState(Capacitor.isNativePlatform())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    return () => {
      // Cleanup ao desmontar
      if (isNative) {
        TextToSpeech.stop().catch(console.error)
      } else {
        window.speechSynthesis?.cancel()
      }
    }
  }, [isNative])

  const speak = useCallback(async (options: TTSOptions) => {
    if (isNative) {
      // ======= USO DO TTS NATIVO (Capacitor) =======
      try {
        await TextToSpeech.speak({
          text: options.text,
          lang: options.lang || 'pt-BR',
          rate: options.rate || 1.0,
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0,
          category: 'playback', // iOS: permite áudio de fundo
        })

        setIsSpeaking(true)
        setIsPaused(false)
        console.log('🔊 [NATIVO] Iniciou leitura em voz alta')

        // O plugin não tem callback de fim, então simulamos
        // Na prática, você escutaria eventos do plugin
      } catch (error) {
        console.error('[NATIVO] Erro ao falar:', error)
        setIsSpeaking(false)
      }
    } else {
      // ======= USO DO WEB SPEECH API (PWA) =======
      if (!window.speechSynthesis) {
        alert('Seu navegador não suporta leitura em voz alta')
        return
      }

      const utterance = new SpeechSynthesisUtterance(options.text)
      utterance.lang = options.lang || 'pt-BR'
      utterance.rate = options.rate || 1.0
      utterance.pitch = options.pitch || 1.0
      utterance.volume = options.volume || 1.0

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
        console.log('🔊 [WEB] Iniciou leitura em voz alta')
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        console.log('🔇 [WEB] Finalizou leitura em voz alta')
      }

      utterance.onerror = (event) => {
        console.error('[WEB] Erro no TTS:', event)
        setIsSpeaking(false)
        setIsPaused(false)
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }
  }, [isNative])

  const pause = useCallback(async () => {
    if (isNative) {
      // O plugin do Capacitor não tem pause/resume nativamente
      // Teria que parar e retomar do ponto (mais complexo)
      console.warn('[NATIVO] Pause não suportado nativamente')
    } else {
      window.speechSynthesis?.pause()
      setIsPaused(true)
      console.log('⏸️ [WEB] TTS pausado')
    }
  }, [isNative])

  const resume = useCallback(async () => {
    if (isNative) {
      console.warn('[NATIVO] Resume não suportado nativamente')
    } else {
      window.speechSynthesis?.resume()
      setIsPaused(false)
      console.log('▶️ [WEB] TTS retomado')
    }
  }, [isNative])

  const stop = useCallback(async () => {
    if (isNative) {
      await TextToSpeech.stop()
      setIsSpeaking(false)
      setIsPaused(false)
      console.log('⏹️ [NATIVO] TTS parado')
    } else {
      window.speechSynthesis?.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
      console.log('⏹️ [WEB] TTS parado')
    }
  }, [isNative])

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    isPaused,
    isNative,
  }
}
