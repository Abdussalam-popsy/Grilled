import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useGeminiSession } from '../hooks/useGeminiSession'
import { useAudioStreamer } from '../hooks/useAudioStreamer'
import { useAnalystSession } from '../hooks/useAnalystSession'
import { AnalysisPanel } from './AnalysisPanel'
import type { Mode } from '../types'

const END_PHRASES = /\b(end.{0,5}(session|here|now)|let'?s\s+(stop|end|wrap|finish)|that'?s\s+(enough|all)|i'?m\s+done|we\s+can\s+(stop|end)|wrap.{0,3}up|i'?ve\s+had\s+enough|call\s+it)\b/i

interface Props {
  mode: Mode
  goal: string
  resourceContext: string
  onEnd: (transcript: string[]) => void
}

export function Session({ mode, goal, resourceContext, onEnd }: Props) {
  const media = useMediaDevices()
  const gemini = useGeminiSession()
  const analyst = useAnalystSession()
  const audioStreamer = useAudioStreamer()
  const frameIntervalRef = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [isStarting, setIsStarting] = useState(true)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const waveformRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number>(0)
  const prevTranscriptLenRef = useRef(0)
  const endBtnRef = useRef<HTMLButtonElement>(null)
  const confirmEndBtnRef = useRef<HTMLButtonElement>(null)
  const [ghostActive, setGhostActive] = useState(false)
  const [ghostTarget, setGhostTarget] = useState({ x: 0, y: 0 })
  const [ghostClicking, setGhostClicking] = useState(false)
  const autoEndingRef = useRef(false)
  const handleEndRef = useRef<() => void>(() => {})

  // Start everything on mount
  useEffect(() => {
    const init = async () => {
      await media.start()
      gemini.connect(mode, goal, resourceContext)
      analyst.connect(goal)
    }
    init()

    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000)
    return () => {
      clearInterval(timer)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      audioStreamer.stop()
      cancelAnimationFrame(animFrameRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Feed transcript to analyst when new lines appear
  useEffect(() => {
    if (gemini.transcript.length > prevTranscriptLenRef.current && analyst.isReady) {
      analyst.feedTranscript(gemini.transcript)
      prevTranscriptLenRef.current = gemini.transcript.length
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.transcript.length, analyst.isReady])

  // Waveform visualizer
  const startWaveform = useCallback((stream: MediaStream) => {
    const audioCtx = new AudioContext()
    const source = audioCtx.createMediaStreamSource(stream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 128
    source.connect(analyser)
    analyserRef.current = analyser

    const draw = () => {
      const canvas = waveformRef.current
      if (!canvas || !analyserRef.current) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const bufferLength = analyserRef.current.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      analyserRef.current.getByteFrequencyData(dataArray)

      const dpr = window.devicePixelRatio || 1
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
      ctx.scale(dpr, dpr)

      const w = canvas.clientWidth
      const h = canvas.clientHeight

      ctx.clearRect(0, 0, w, h)

      const barCount = 40
      const gap = 3
      const barWidth = (w - gap * (barCount - 1)) / barCount
      const step = Math.floor(bufferLength / barCount)

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] / 255
        const barHeight = Math.max(3, value * h * 0.85)

        const x = i * (barWidth + gap)
        const y = (h - barHeight) / 2

        const intensity = Math.min(1, value * 1.5)
        const r = Math.round(234 + (245 - 234) * intensity)
        const g = Math.round(88 + (158 - 88) * intensity)
        const b = Math.round(12 + (245 - 12) * intensity)
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.4 + intensity * 0.6})`

        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, 2)
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }
    draw()
  }, [])

  // Start streaming when Gemini is ready
  useEffect(() => {
    if (!gemini.isReady || !media.isActive) return
    setIsStarting(false)

    frameIntervalRef.current = window.setInterval(() => {
      const frame = media.captureFrame()
      if (frame) gemini.sendVideoFrame(frame)
    }, 1000)

    const audioStream = media.getAudioStream()
    if (audioStream) {
      audioStreamer.start(audioStream, (base64Audio) => {
        gemini.sendAudio(base64Audio)
      })
      startWaveform(audioStream)
    }

    // Kick off the conversation so Gemini speaks first
    gemini.sendText('Hi, I\'m ready to begin.')

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.isReady, media.isActive])

  const handleEnd = () => {
    audioStreamer.stop()
    cancelAnimationFrame(animFrameRef.current)
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    media.stop()
    gemini.disconnect()
    analyst.disconnect()
    onEnd(gemini.transcript)
  }

  handleEndRef.current = handleEnd

  const startAutoEnd = useCallback(() => {
    const cx = window.innerWidth / 2
    const cy = window.innerHeight * 0.65

    setGhostTarget({ x: cx, y: cy })
    setGhostActive(true)

    setTimeout(() => {
      if (!endBtnRef.current) { handleEndRef.current(); return }
      const r = endBtnRef.current.getBoundingClientRect()
      setGhostTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }, 400)

    setTimeout(() => setGhostClicking(true), 1200)

    setTimeout(() => {
      setGhostClicking(false)
      setShowEndConfirm(true)
    }, 1450)

    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!confirmEndBtnRef.current) { handleEndRef.current(); return }
          const r = confirmEndBtnRef.current.getBoundingClientRect()
          setGhostTarget({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
        })
      })
    }, 1900)

    setTimeout(() => setGhostClicking(true), 2800)

    setTimeout(() => {
      setGhostClicking(false)
      setGhostActive(false)
      handleEndRef.current()
    }, 3050)
  }, [])

  useEffect(() => {
    if (autoEndingRef.current) return

    const t = gemini.transcript
    if (t.length < 2) return

    let endIdx = -1
    for (let i = t.length - 1; i >= 0; i--) {
      if (t[i].startsWith('You:') && END_PHRASES.test(t[i])) {
        endIdx = i
        break
      }
    }
    if (endIdx === -1) return

    const responded = t.slice(endIdx + 1).some(l => l.startsWith('Gemini:'))
    if (!responded) return

    autoEndingRef.current = true
    setTimeout(() => startAutoEnd(), 2000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.transcript.length])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full bg-ember-600/4 blur-[100px] pointer-events-none" />

      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-surface-200/20"
      >
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${gemini.isReady ? 'bg-ember-500' : 'bg-surface-400'}`}>
            {gemini.isReady && (
              <div className="w-2.5 h-2.5 rounded-full bg-ember-500 animate-ping" />
            )}
          </div>
          <span className="text-sm text-surface-500 font-medium">
            {isStarting ? 'Connecting...' : 'Live Session'}
          </span>
        </div>

        <span className="font-mono text-xl tabular-nums tracking-wider text-surface-600">
          {formatTime(elapsed)}
        </span>

        <button
          ref={endBtnRef}
          onClick={() => setShowEndConfirm(true)}
          className="px-4 py-2 bg-surface-100 border border-surface-200/40 text-surface-500 hover:text-red-400 hover:border-red-500/30 rounded-lg font-medium text-sm transition-all cursor-pointer"
        >
          End Session
        </button>
      </motion.div>

      {/* Main content — split layout */}
      <div className="flex-1 flex flex-row relative z-10 overflow-hidden">
        {/* Left: camera + waveform + transcript (60%) */}
        <div className="w-[60%] flex flex-col items-center justify-center p-6 gap-5">
          {/* Camera preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg aspect-[4/3] bg-surface-50 rounded-2xl overflow-hidden border border-surface-200/20"
          >
            <video
              ref={media.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {!media.isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Observation indicators */}
            {gemini.isReady && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />
                  <span className="text-[10px] text-ember-400/80 uppercase tracking-wider font-medium">Observing</span>
                </div>
                <div className="flex gap-2">
                  <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] text-surface-500 uppercase tracking-wider">
                    Eye contact
                  </div>
                  <div className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] text-surface-500 uppercase tracking-wider">
                    Confidence
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Waveform */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-lg h-14"
          >
            <canvas
              ref={waveformRef}
              className="w-full h-full"
            />
          </motion.div>

          {/* Live transcript (last few lines) */}
          <AnimatePresence mode="popLayout">
            {gemini.transcript.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-lg max-h-28 overflow-y-auto bg-surface-50/50 backdrop-blur-sm border border-surface-200/20 rounded-xl p-4 space-y-2"
              >
                {gemini.transcript.slice(-4).map((line, i) => (
                  <motion.p
                    key={`${gemini.transcript.length - 4 + i}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-sm leading-relaxed ${
                      line.startsWith('Gemini:')
                        ? 'text-ember-400'
                        : 'text-surface-500'
                    }`}
                  >
                    {line}
                  </motion.p>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Errors */}
          {(gemini.error || media.error) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3 text-red-400 text-sm max-w-lg w-full"
            >
              {gemini.error || media.error}
            </motion.div>
          )}
        </div>

        {/* Right: analysis panel (40%) */}
        <div className="w-[40%]">
          <AnalysisPanel
            analysis={analyst.analysis}
            isConnected={analyst.isReady}
          />
        </div>
      </div>

      {/* End session confirmation overlay */}
      <AnimatePresence>
        {showEndConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface-100 border border-surface-200/40 rounded-2xl p-8 max-w-sm w-full mx-6 text-center"
            >
              <h3 className="text-xl font-semibold mb-2">End this session?</h3>
              <p className="text-surface-500 text-sm mb-6">
                Your gap report will be generated from the conversation so far.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEndConfirm(false)}
                  className="flex-1 py-3 bg-surface-200/50 rounded-xl font-medium text-sm hover:bg-surface-200 transition-colors cursor-pointer"
                >
                  Keep going
                </button>
                <button
                  ref={confirmEndBtnRef}
                  onClick={handleEnd}
                  className="flex-1 py-3 bg-red-600 rounded-xl font-medium text-sm hover:bg-red-700 transition-colors cursor-pointer"
                >
                  End & get report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ghost cursor for auto-end */}
      <AnimatePresence>
        {ghostActive && (
          <motion.div
            className="fixed pointer-events-none"
            style={{ zIndex: 200 }}
            initial={{ x: ghostTarget.x, y: ghostTarget.y, opacity: 0 }}
            animate={{
              x: ghostTarget.x,
              y: ghostTarget.y,
              opacity: 1,
              scale: ghostClicking ? 0.85 : 1,
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{
              x: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.3 },
              scale: { duration: 0.12 },
            }}
          >
            <div className="absolute -top-1 -left-1 w-8 h-8 bg-ember-500/25 rounded-full blur-lg animate-pulse" />
            <svg
              width="20"
              height="24"
              viewBox="0 0 20 24"
              className="drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 6px rgba(234, 88, 12, 0.4))' }}
            >
              <path
                d="M0 0 L0 18 L4.5 13.5 L8 21 L11 19.5 L7.5 12 L13 12 Z"
                fill="rgba(255,255,255,0.85)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="0.5"
              />
            </svg>
            {ghostClicking && (
              <motion.div
                className="absolute top-0 left-0 w-5 h-5 border-2 border-ember-400/50 rounded-full"
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
