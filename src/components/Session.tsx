import { useEffect, useRef, useState } from 'react'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useGeminiSession } from '../hooks/useGeminiSession'
import { useAudioStreamer } from '../hooks/useAudioStreamer'
import type { Mode } from '../types'

interface Props {
  mode: Mode
  goal: string
  resourceContext: string
  onEnd: (transcript: string[]) => void
}

export function Session({ mode, goal, resourceContext, onEnd }: Props) {
  const media = useMediaDevices()
  const gemini = useGeminiSession()
  const audioStreamer = useAudioStreamer()
  const frameIntervalRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isStarting, setIsStarting] = useState(true)

  // Start everything on mount
  useEffect(() => {
    const init = async () => {
      await media.start()
      gemini.connect(mode, goal, resourceContext)
    }
    init()

    // Timer
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000)

    return () => {
      clearInterval(timer)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      audioStreamer.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Start streaming when Gemini is ready
  useEffect(() => {
    if (!gemini.isReady || !media.isActive) return
    setIsStarting(false)

    // Send video frames at ~1fps
    frameIntervalRef.current = window.setInterval(() => {
      const frame = media.captureFrame()
      if (frame) {
        gemini.sendVideoFrame(frame)
      }
    }, 1000)

    // Start audio streaming
    const audioStream = media.getAudioStream()
    if (audioStream) {
      audioStreamer.start(audioStream, (base64Audio) => {
        gemini.sendAudio(base64Audio)
      })
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.isReady, media.isActive])

  const handleEnd = () => {
    audioStreamer.stop()
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    media.stop()
    gemini.disconnect()
    onEnd(gemini.transcript)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${gemini.isReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span className="text-sm text-neutral-400">
            {isStarting ? 'Connecting...' : 'Live'}
          </span>
        </div>
        <span className="font-mono text-lg tabular-nums">{formatTime(elapsed)}</span>
        <button
          onClick={handleEnd}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
        >
          End Session
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* Camera preview */}
        <div className="relative w-full max-w-md aspect-[4/3] bg-neutral-900 rounded-2xl overflow-hidden">
          <video
            ref={media.videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {!media.isActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-neutral-500">Camera loading...</span>
            </div>
          )}
        </div>

        {/* Audio waveform placeholder */}
        <div className="flex items-center gap-1 h-12">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-white/30 rounded-full"
              style={{
                height: `${Math.random() * 100}%`,
                animation: gemini.isReady ? `pulse 1s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
              }}
            />
          ))}
        </div>

        {/* Transcript */}
        {gemini.transcript.length > 0 && (
          <div className="w-full max-w-md max-h-40 overflow-y-auto bg-neutral-900/50 rounded-xl p-4 space-y-2">
            {gemini.transcript.slice(-5).map((line, i) => (
              <p key={i} className={`text-sm ${line.startsWith('Gemini:') ? 'text-blue-400' : 'text-neutral-300'}`}>
                {line}
              </p>
            ))}
          </div>
        )}

        {/* Error display */}
        {(gemini.error || media.error) && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-2 text-red-400 text-sm">
            {gemini.error || media.error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}
