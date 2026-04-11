import { useRef, useState, useCallback, useEffect } from 'react'
import { GeminiLiveSession } from '../lib/gemini'
import type { Mode } from '../types'

interface AudioPlayerState {
  audioContext: AudioContext | null
  nextStartTime: number
}

interface UseGeminiSessionReturn {
  isConnected: boolean
  isReady: boolean
  transcript: string[]
  error: string | null
  connect: (mode: Mode, goal: string, resourceContext: string) => void
  disconnect: () => void
  sendAudio: (base64Audio: string) => void
  sendVideoFrame: (base64Image: string) => void
  sendText: (text: string) => void
}

export function useGeminiSession(): UseGeminiSessionReturn {
  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const audioPlayerRef = useRef<AudioPlayerState>({ audioContext: null, nextStartTime: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const playAudioChunk = useCallback((base64Audio: string) => {
    const player = audioPlayerRef.current
    if (!player.audioContext) {
      player.audioContext = new AudioContext({ sampleRate: 24000 })
      player.nextStartTime = player.audioContext.currentTime
    }

    const ctx = player.audioContext
    const binaryStr = atob(base64Audio)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    // Convert 16-bit PCM to Float32
    const samples = new Float32Array(bytes.length / 2)
    const dataView = new DataView(bytes.buffer)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = dataView.getInt16(i * 2, true) / 32768
    }

    const audioBuffer = ctx.createBuffer(1, samples.length, 24000)
    audioBuffer.getChannelData(0).set(samples)

    const source = ctx.createBufferSource()
    source.buffer = audioBuffer

    source.connect(ctx.destination)

    const now = ctx.currentTime
    if (player.nextStartTime < now) {
      player.nextStartTime = now
    }
    source.start(player.nextStartTime)
    player.nextStartTime += audioBuffer.duration
  }, [])

  const connect = useCallback((mode: Mode, goal: string, resourceContext: string) => {
    const session = new GeminiLiveSession({
      onAudioOutput: (audioData) => {
        playAudioChunk(audioData)
      },
      onTextOutput: (text) => {
        setTranscript(prev => [...prev, `Gemini: ${text}`])
      },
      onReady: () => {
        setIsReady(true)
      },
      onError: (err) => {
        setError(err)
      },
      onClose: () => {
        setIsConnected(false)
        setIsReady(false)
      },
      onInterrupted: () => {
        // Audio was interrupted by user speaking
        const player = audioPlayerRef.current
        if (player.audioContext) {
          player.nextStartTime = player.audioContext.currentTime
        }
      }
    })

    session.connect(mode, goal, resourceContext)
    sessionRef.current = session
    setIsConnected(true)
    setError(null)
  }, [playAudioChunk])

  const disconnect = useCallback(() => {
    sessionRef.current?.disconnect()
    sessionRef.current = null
    setIsConnected(false)
    setIsReady(false)

    const player = audioPlayerRef.current
    if (player.audioContext) {
      player.audioContext.close()
      player.audioContext = null
    }
  }, [])

  const sendAudio = useCallback((base64Audio: string) => {
    sessionRef.current?.sendAudio(base64Audio)
  }, [])

  const sendVideoFrame = useCallback((base64Image: string) => {
    sessionRef.current?.sendVideoFrame(base64Image)
  }, [])

  const sendText = useCallback((text: string) => {
    setTranscript(prev => [...prev, `You: ${text}`])
    sessionRef.current?.sendText(text)
  }, [])

  useEffect(() => {
    return () => { disconnect() }
  }, [disconnect])

  return {
    isConnected,
    isReady,
    transcript,
    error,
    connect,
    disconnect,
    sendAudio,
    sendVideoFrame,
    sendText,
  }
}
