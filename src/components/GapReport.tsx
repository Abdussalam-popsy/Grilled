import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { GapReport as GapReportType, AnswerFeedback, SessionRecord } from '../types/index.ts'
import { generateStudyImage } from '../lib/gemini'
import { getHistory } from '../lib/sessionHistory'

interface Props {
  report: GapReportType
  feedbackHistory: AnswerFeedback[]
  sessionDuration: number
  userName: string
  onRestart: () => void
  onReportReady: (readinessScore: number) => void
}

function ScoreBar({ label, score, max = 5 }: { label: string; score: number; max?: number }) {
  const percentage = (score / max) * 100
  const color =
    score / max >= 0.8 ? 'bg-emerald-500' :
    score / max >= 0.6 ? 'bg-amber-400' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-surface-500 w-20 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-2 bg-surface-200/40 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="text-xs font-mono text-surface-400 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

function ProgressChart({ history }: { history: SessionRecord[] }) {
  if (history.length < 2) return null

  const scores = history.map(h => h.readinessScore)
  const maxScore = 10
  const width = 400
  const height = 120
  const padding = { top: 10, right: 20, bottom: 25, left: 30 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = scores.map((score, i) => {
    const x = padding.left + (i / (scores.length - 1)) * chartW
    const y = padding.top + chartH - (score / maxScore) * chartH
    return { x, y, score }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-indigo-400" />
        <h2 className="text-lg font-semibold tracking-tight">Progress Over Time</h2>
        <span className="text-xs text-surface-400 ml-auto">{history.length} sessions</span>
      </div>
      <div className="bg-surface-50/60 border border-surface-200/20 rounded-xl p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {[0, 2.5, 5, 7.5, 10].map(v => {
            const y = padding.top + chartH - (v / maxScore) * chartH
            return (
              <g key={v}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="8">{v}</text>
              </g>
            )
          })}

          <polyline
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />

          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>
          </defs>

          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="3.5" fill="#1e1b2e" stroke="#818cf8" strokeWidth="2" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="8">{p.score}</text>
            </g>
          ))}

          {points.map((p, i) => {
            const date = new Date(history[i].date)
            const label = `${date.getMonth() + 1}/${date.getDate()}`
            return (
              <text key={i} x={p.x} y={height - 4} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="7">{label}</text>
            )
          })}
        </svg>
      </div>
    </motion.div>
  )
}

function QuestionBreakdown({ feedback }: { feedback: AnswerFeedback[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  if (feedback.length === 0) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-2 h-2 rounded-full bg-ember-500" />
        <h2 className="text-lg font-semibold tracking-tight">Question Breakdown</h2>
        <span className="text-xs text-surface-400 ml-auto">{feedback.length} questions</span>
      </div>
      <div className="space-y-2">
        {feedback.map((f, i) => {
          const hasScores = f.accuracy + f.depth + f.clarity > 0
          const avg = hasScores ? ((f.accuracy + f.depth + f.clarity) / 3).toFixed(1) : null
          const isExpanded = expandedIdx === i

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.04 }}
              className="bg-surface-50/60 border border-surface-200/20 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer hover:bg-surface-100/30 transition-colors"
              >
                <span className="text-xs font-mono text-surface-400 w-6 shrink-0">Q{i + 1}</span>
                <span className="text-sm text-surface-600 flex-1 leading-snug truncate">{f.question}</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ${
                  avg === null ? 'bg-surface-200/30 text-surface-400' :
                  Number(avg) >= 4 ? 'bg-emerald-950/40 text-emerald-400' :
                  Number(avg) >= 3 ? 'bg-amber-950/40 text-amber-400' :
                  'bg-red-950/40 text-red-400'
                }`}>
                  {avg ?? 'Hints'}
                </span>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  className={`text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                >
                  <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 space-y-3 border-t border-surface-200/15 pt-3">
                      {hasScores && (
                        <>
                          <ScoreBar label="Accuracy" score={f.accuracy} />
                          <ScoreBar label="Depth" score={f.depth} />
                          <ScoreBar label="Clarity" score={f.clarity} />
                        </>
                      )}

                      {f.strengths.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {f.strengths.map((s, si) => (
                            <p key={si} className="text-xs text-emerald-400/80 pl-3 border-l-2 border-emerald-500/30">{s}</p>
                          ))}
                        </div>
                      )}
                      {f.gaps.length > 0 && (
                        <div className="space-y-1">
                          {f.gaps.map((g, gi) => (
                            <p key={gi} className="text-xs text-amber-400/80 pl-3 border-l-2 border-amber-500/30">{g}</p>
                          ))}
                        </div>
                      )}
                      {f.coaching && (
                        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2.5">
                          <p className="text-[10px] text-indigo-400/60 uppercase tracking-wider font-semibold mb-1">Coach tip</p>
                          <p className="text-xs text-indigo-300/90 leading-relaxed italic">{f.coaching}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}

export function GapReport({ report, feedbackHistory, sessionDuration, userName, onRestart, onReportReady }: Props) {
  const [cramImages, setCramImages] = useState<Record<string, string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([])
  const [hasSaved, setHasSaved] = useState(false)

  useEffect(() => {
    if (!hasSaved) {
      onReportReady(report.readiness_score)
      setHasSaved(true)
      setSessionHistory(getHistory())
    }
  }, [hasSaved, report.readiness_score, onReportReady])

  useEffect(() => {
    report.top_cram_topics.forEach(async (topic) => {
      try {
        const url = await generateStudyImage(topic.visual_description)
        setCramImages(prev => ({ ...prev, [topic.topic]: url }))
      } catch (err) {
        console.error(`Failed to generate image for ${topic.topic}:`, err)
        setImageErrors(prev => ({ ...prev, [topic.topic]: true }))
      }
    })
  }, [report.top_cram_topics])

  const score = report.readiness_score
  const normalizedScore = score > 10 ? score / 100 : score / 10

  const scoreColor = normalizedScore >= 0.7
    ? 'text-green-400' : normalizedScore >= 0.4
      ? 'text-amber-400' : 'text-red-400'

  const scoreRingColor = normalizedScore >= 0.7
    ? 'stroke-green-400' : normalizedScore >= 0.4
      ? 'stroke-amber-400' : 'stroke-red-400'

  const circumference = 2 * Math.PI * 54
  const progress = normalizedScore * circumference
  const displayScore = score > 10 ? score : score * 10
  const displayMax = 100

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}m ${sec}s`
  }

  // Compute average scores from feedback history
  const avgAccuracy = feedbackHistory.length > 0
    ? feedbackHistory.reduce((sum, f) => sum + f.accuracy, 0) / feedbackHistory.length
    : 0
  const avgDepth = feedbackHistory.length > 0
    ? feedbackHistory.reduce((sum, f) => sum + f.depth, 0) / feedbackHistory.length
    : 0
  const avgClarity = feedbackHistory.length > 0
    ? feedbackHistory.reduce((sum, f) => sum + f.clarity, 0) / feedbackHistory.length
    : 0

  return (
    <div className="grain min-h-screen bg-surface-0 text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-ember-600/4 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        {/* 1. Score Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="text-ember-500 text-sm font-medium uppercase tracking-wider mb-6">Session Complete</p>

          {/* Circular score */}
          <div className="relative inline-flex items-center justify-center mb-4">
            <svg width="132" height="132" viewBox="0 0 132 132" className="-rotate-90">
              <circle cx="66" cy="66" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-surface-200/20" />
              <motion.circle
                cx="66" cy="66" r="54"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={scoreRingColor}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: circumference - progress }}
                transition={{ duration: 1.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className={`text-4xl font-bold tabular-nums ${scoreColor}`}
              >
                {Math.round(displayScore)}
              </motion.span>
              <span className="text-xs text-surface-400 mt-0.5">/ {displayMax}</span>
            </div>
          </div>

          {/* Session meta */}
          <div className="flex items-center justify-center gap-4 text-xs text-surface-400 mb-4">
            <span>{new Date().toLocaleDateString()}</span>
            <span className="w-1 h-1 rounded-full bg-surface-300" />
            <span>{formatDuration(sessionDuration)}</span>
            <span className="w-1 h-1 rounded-full bg-surface-300" />
            <span>{feedbackHistory.length} questions</span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl italic tracking-tight mb-3">
            {userName ? `${userName}'s Dashboard` : 'Session Dashboard'}
          </h1>
          <p className="text-surface-500 max-w-md mx-auto leading-relaxed text-[15px]">
            {report.readiness_justification}
          </p>
        </motion.div>

        {/* 2. Performance Overview (avg scores) */}
        {feedbackHistory.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <h2 className="text-lg font-semibold tracking-tight">Performance Overview</h2>
            </div>
            <div className="bg-surface-50/60 border border-surface-200/20 rounded-xl p-5 space-y-3">
              <ScoreBar label="Accuracy" score={avgAccuracy} />
              <ScoreBar label="Depth" score={avgDepth} />
              <ScoreBar label="Clarity" score={avgClarity} />
            </div>
          </motion.section>
        )}

        {/* 3. Question Breakdown */}
        <div className="mb-8">
          <QuestionBreakdown feedback={feedbackHistory} />
        </div>

        {/* 4. Strong / Shaky / Weak cards */}
        {report.strong.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h2 className="text-lg font-semibold tracking-tight">Strong</h2>
              <span className="text-xs text-surface-400 ml-auto">{report.strong.length} topics</span>
            </div>
            <div className="space-y-2">
              {report.strong.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="bg-green-950/20 border border-green-900/20 rounded-xl px-5 py-4"
                >
                  <div className="font-medium text-[15px]">{t.topic}</div>
                  <div className="text-sm text-green-400/60 mt-1.5 leading-relaxed">{t.justification}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {report.shaky.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <h2 className="text-lg font-semibold tracking-tight">Needs Review</h2>
              <span className="text-xs text-surface-400 ml-auto">{report.shaky.length} topics</span>
            </div>
            <div className="space-y-2">
              {report.shaky.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  className="bg-amber-950/20 border border-amber-900/20 rounded-xl px-5 py-4"
                >
                  <div className="font-medium text-[15px]">{t.topic}</div>
                  <div className="text-sm text-amber-400/60 mt-1.5 leading-relaxed">{t.what_was_missing}</div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {report.weak.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <h2 className="text-lg font-semibold tracking-tight">Priority Review</h2>
              <span className="text-xs text-surface-400 ml-auto">{report.weak.length} topics</span>
            </div>
            <div className="space-y-2">
              {report.weak.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.05 }}
                  className="bg-red-950/20 border border-red-900/20 rounded-xl px-5 py-4"
                >
                  <div className="font-medium text-[15px]">{t.topic}</div>
                  <div className="text-sm text-red-400/60 mt-2 leading-relaxed">
                    <span className="text-red-400/40 uppercase text-xs tracking-wider font-semibold">Answer: </span>
                    {t.correct_answer}
                  </div>
                  <div className="text-sm text-red-400/40 mt-1.5 leading-relaxed">
                    <span className="text-red-400/30 uppercase text-xs tracking-wider font-semibold">Review: </span>
                    {t.review_angle}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        <div className="mb-8">
          <ProgressChart history={sessionHistory} />
        </div>

        {report.top_cram_topics.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-10"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-2 h-2 rounded-full bg-ember-500" />
              <h2 className="text-lg font-semibold tracking-tight">Visual Cram Cards</h2>
              <span className="text-xs text-surface-400 ml-auto">powered by Gemini</span>
            </div>
            <div className="space-y-4">
              {report.top_cram_topics.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="bg-surface-50 border border-surface-200/20 rounded-xl overflow-hidden"
                >
                  <div className="px-5 py-3.5 border-b border-surface-200/15">
                    <div className="font-medium text-[15px]">{t.topic}</div>
                  </div>
                  <div className="aspect-video bg-surface-100 flex items-center justify-center relative">
                    {cramImages[t.topic] ? (
                      <img
                        src={cramImages[t.topic]}
                        alt={`Study aid: ${t.topic}`}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : imageErrors[t.topic] ? (
                      <div className="text-surface-400 text-sm px-6 text-center">
                        <p className="mb-1">Could not generate visual</p>
                        <p className="text-xs text-surface-300">{t.visual_description}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin" />
                        <span className="text-surface-400 text-xs">Generating visual...</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Restart */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center pt-4 pb-12"
        >
          <button
            onClick={onRestart}
            className="px-8 py-3.5 bg-surface-100 border border-surface-200/40 text-white font-medium rounded-xl hover:border-ember-600/30 hover:bg-surface-100/80 transition-all cursor-pointer text-[15px]"
          >
            Start New Session
          </button>
        </motion.div>
      </div>
    </div>
  )
}
