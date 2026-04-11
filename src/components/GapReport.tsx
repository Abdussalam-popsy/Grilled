import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import type { GapReport as GapReportType } from '../types'

interface Props {
  report: GapReportType
  sessionDuration: number
  userName: string
  onRestart: () => void
  onReportReady: (readinessScore: number) => void
}

export function GapReport({ report, sessionDuration, userName, onRestart, onReportReady }: Props) {
  const [hasSaved, setHasSaved] = useState(false)

  useEffect(() => {
    if (!hasSaved) {
      onReportReady(report.readiness_score)
      setHasSaved(true)
    }
  }, [hasSaved, report.readiness_score, onReportReady])

  const score = report.readiness_score
  const normalizedScore = score > 10 ? score / 100 : score / 10

  const scoreColor = normalizedScore >= 0.7
    ? 'text-green-400' : normalizedScore >= 0.4
      ? 'text-amber-400' : 'text-red-400'

  const scoreRingColor = normalizedScore >= 0.7
    ? 'stroke-green-400' : normalizedScore >= 0.4
      ? 'stroke-amber-400' : 'stroke-red-400'

  const circumference = 2 * Math.PI * 34
  const progress = normalizedScore * circumference
  const displayScore = score > 10 ? score : score * 10

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  const questionCount = report.strong.length + report.shaky.length + report.weak.length

  return (
    <div className="grain h-screen flex flex-col overflow-hidden bg-surface-0 text-white relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-ember-600/4 blur-[100px] pointer-events-none" />

      {/* Header band */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 shrink-0 border-b border-surface-200/20 px-4 py-3"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Compact score ring */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-200/20" />
              <motion.circle
                cx="40" cy="40" r="34"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                className={scoreRingColor}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={`text-lg font-bold tabular-nums ${scoreColor}`}>
                {Math.round(displayScore)}
              </span>
              <span className="text-[9px] text-surface-400">/ 100</span>
            </div>
          </div>

          {/* Title + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl italic tracking-tight truncate">
              {userName ? `${userName}'s Dashboard` : 'Session Dashboard'}
            </h1>
            <div className="flex items-center gap-3 text-[11px] text-surface-400 mt-0.5">
              <span>{new Date().toLocaleDateString()}</span>
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              <span>{formatDuration(sessionDuration)}</span>
              <span className="w-1 h-1 rounded-full bg-surface-300" />
              <span>{questionCount} topics</span>
            </div>
            <p className="text-xs text-surface-500 mt-1 truncate max-w-lg">
              {report.readiness_justification}
            </p>
          </div>

          {/* Restart button */}
          <button
            onClick={onRestart}
            className="shrink-0 px-4 py-2 bg-surface-100 border border-surface-200/40 text-white font-medium rounded-lg hover:border-ember-600/30 hover:bg-surface-100/80 transition-all cursor-pointer text-sm"
          >
            New Session
          </button>
        </div>
      </motion.div>

      {/* Main content — 3-column grid */}
      <div className="flex-1 min-h-0 overflow-hidden relative z-10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full max-w-7xl mx-auto">
          {/* Strong topics */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col min-h-0"
          >
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h2 className="text-sm font-semibold tracking-tight">Strong</h2>
              <span className="text-[10px] text-surface-400 ml-auto">{report.strong.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {report.strong.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="bg-green-950/20 border border-green-900/20 rounded-xl px-4 py-3"
                >
                  <div className="font-medium text-sm">{t.topic}</div>
                  <div className="text-xs text-green-400/60 mt-1 leading-relaxed">{t.justification}</div>
                </motion.div>
              ))}
              {report.strong.length === 0 && (
                <p className="text-xs text-surface-400 italic py-4 text-center">No strong topics yet</p>
              )}
            </div>
          </motion.div>

          {/* Shaky topics */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col min-h-0"
          >
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-sm font-semibold tracking-tight">Needs Review</h2>
              <span className="text-[10px] text-surface-400 ml-auto">{report.shaky.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {report.shaky.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.04 }}
                  className="bg-amber-950/20 border border-amber-900/20 rounded-xl px-4 py-3"
                >
                  <div className="font-medium text-sm">{t.topic}</div>
                  <div className="text-xs text-amber-400/60 mt-1 leading-relaxed">{t.what_was_missing}</div>
                </motion.div>
              ))}
              {report.shaky.length === 0 && (
                <p className="text-xs text-surface-400 italic py-4 text-center">No shaky topics</p>
              )}
            </div>
          </motion.div>

          {/* Weak topics */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col min-h-0"
          >
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <h2 className="text-sm font-semibold tracking-tight">Priority Review</h2>
              <span className="text-[10px] text-surface-400 ml-auto">{report.weak.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {report.weak.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                  className="bg-red-950/20 border border-red-900/20 rounded-xl px-4 py-3"
                >
                  <div className="font-medium text-sm">{t.topic}</div>
                  <div className="text-xs text-red-400/60 mt-1.5 leading-relaxed">
                    <span className="text-red-400/40 uppercase text-[10px] tracking-wider font-semibold">Answer: </span>
                    {t.correct_answer}
                  </div>
                  <div className="text-xs text-red-400/40 mt-1 leading-relaxed">
                    <span className="text-red-400/30 uppercase text-[10px] tracking-wider font-semibold">Review: </span>
                    {t.review_angle}
                  </div>
                </motion.div>
              ))}
              {report.weak.length === 0 && (
                <p className="text-xs text-surface-400 italic py-4 text-center">No weak topics</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
