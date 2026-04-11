import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useMediaDevices } from '../hooks/useMediaDevices'
import { useGeminiSession } from '../hooks/useGeminiSession'
import { useAudioStreamer } from '../hooks/useAudioStreamer'
import { useAnalystSession } from '../hooks/useAnalystSession'
import { AnalysisPanel } from './AnalysisPanel'
import type { Mode, AnswerFeedback, CoachingTip } from '../types'

function coachingTipsToFeedback(tips: CoachingTip[]): AnswerFeedback[] {
  return tips.map((tip) => ({
    question: tip.question,
    accuracy: 0,
    depth: 0,
    clarity: 0,
    strengths: tip.hints,
    gaps: tip.key_terms.map((term) => `Key term to weave in: ${term}`),
    coaching: tip.hints.join(' · '),
  }))
}

const GEMINI_FAREWELL = /\b(goodbye|good\s*bye|bye|good\s+luck|best\s+of\s+luck|take\s+care|all\s+the\s+best|it\s+was\s+(great|nice|a\s+pleasure))\b/i

interface Props {
  mode: Mode
  goal: string
  resourceContext: string
  userName?: string
  onEnd: (transcript: string[], feedbackHistory: AnswerFeedback[], duration: number) => void
}

export function Session({ mode, goal, resourceContext, userName, onEnd }: Props) {
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
  const autoEndingRef = useRef(false)

  // Start everything on mount
  useEffect(() => {
    const init = async () => {
      await media.start()
      gemini.connect(mode, goal, resourceContext, userName)
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

  // Flush accumulated transcript when analyst becomes ready (handles race condition)
  const analystWasReadyRef = useRef(false)
  useEffect(() => {
    if (analyst.isReady && !analystWasReadyRef.current) {
      analystWasReadyRef.current = true
      if (gemini.transcript.length > 0) {
        analyst.feedTranscript(gemini.transcript)
        prevTranscriptLenRef.current = gemini.transcript.length
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyst.isReady])

  // Feed transcript to analyst when new lines appear
  useEffect(() => {
    if (gemini.transcript.length > prevTranscriptLenRef.current && analyst.isReady) {
      analyst.feedTranscript(gemini.transcript)
      prevTranscriptLenRef.current = gemini.transcript.length
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gemini.transcript.length, analyst.isReady])

  // Attach screen share stream to video element
  useEffect(() => {
    if (media.screenVideoRef.current) {
      media.screenVideoRef.current.srcObject = media.screenStream
    }
  }, [media.screenStream, media.screenVideoRef])

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
    const feedbackHistory = coachingTipsToFeedback(analyst.analysis.history)
    analyst.disconnect()
    onEnd(gemini.transcript, feedbackHistory, elapsed)
  }

  const handleEndRef = useRef(handleEnd)
  handleEndRef.current = handleEnd

  // Auto-end: detect Gemini's farewell after wrapping up, then end the session
  useEffect(() => {
    if (autoEndingRef.current) return

    const t = gemini.transcript
    if (t.length < 3) return

    const recent = t.slice(-4)
    if (recent.some(l => l.startsWith('Gemini:') && GEMINI_FAREWELL.test(l))) {
      autoEndingRef.current = true
      setTimeout(() => handleEndRef.current(), 3000)
    }
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

        <div className="flex items-center gap-2">
          <button
            onClick={media.isScreenSharing ? media.stopScreenShare : media.startScreenShare}
            className={`px-4 py-2 border rounded-lg font-medium text-sm transition-all cursor-pointer ${
              media.isScreenSharing
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400 hover:bg-indigo-600/30'
                : 'bg-surface-100 border-surface-200/40 text-surface-500 hover:text-indigo-400 hover:border-indigo-500/30'
            }`}
          >
            {media.isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="px-4 py-2 bg-surface-100 border border-surface-200/40 text-surface-500 hover:text-red-400 hover:border-red-500/30 rounded-lg font-medium text-sm transition-all cursor-pointer"
          >
            End Session
          </button>
        </div>
      </motion.div>

      {/* Main content — split layout */}
      <div className="flex-1 flex flex-row relative z-10 overflow-hidden">
        {/* Left: camera + waveform + transcript (60%) */}
        <div className="w-[60%] flex flex-col items-center justify-center p-6 gap-5">
          {/* Camera / Screen share preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg aspect-[4/3] bg-surface-50 rounded-2xl overflow-hidden border border-surface-200/20"
          >
            {/* Screen share — main view when active */}
            {media.isScreenSharing && (
              <video
                ref={media.screenVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain bg-black"
              />
            )}

            {/* Camera — main when not sharing, PiP overlay when sharing */}
            <video
              ref={media.videoRef}
              autoPlay
              playsInline
              muted
              className={media.isScreenSharing
                ? 'absolute bottom-3 right-3 w-32 aspect-[4/3] object-cover scale-x-[-1] rounded-lg border border-surface-200/30 shadow-lg z-10'
                : 'w-full h-full object-cover scale-x-[-1]'
              }
            />

            {!media.isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Observation indicators */}
            {gemini.isReady && !media.isScreenSharing && (
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

            {/* Screen sharing indicator */}
            {gemini.isReady && media.isScreenSharing && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/60 backdrop-blur-sm rounded-md">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 animate-pulse" />
                <span className="text-[10px] text-indigo-200 uppercase tracking-wider font-medium">Screen Sharing</span>
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
            error={analyst.error}
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

    </div>
  )
}
