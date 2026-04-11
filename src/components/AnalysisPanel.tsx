import { motion, AnimatePresence } from 'motion/react'
import type { AnalysisState, AnswerFeedback } from '../types'

interface Props {
  analysis: AnalysisState
  isConnected: boolean
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const percentage = (score / 5) * 100
  const color =
    score >= 4 ? 'bg-emerald-500' :
    score >= 3 ? 'bg-ember-400' :
    'bg-red-500'

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-surface-500 w-16 shrink-0 uppercase tracking-wider">{label}</span>
      <div className="flex-1 h-2 bg-surface-200/40 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span className="text-xs font-mono text-surface-400 w-6 text-right">{score}</span>
    </div>
  )
}

function FeedbackCard({ feedback, index }: { feedback: AnswerFeedback; index: number }) {
  const avg = ((feedback.accuracy + feedback.depth + feedback.clarity) / 3).toFixed(1)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-surface-50/60 border border-surface-200/20 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-surface-600 leading-snug flex-1">
          {feedback.question}
        </p>
        <span className={`text-xs font-mono px-2 py-0.5 rounded-md shrink-0 ${
          Number(avg) >= 4 ? 'bg-emerald-950/40 text-emerald-400' :
          Number(avg) >= 3 ? 'bg-ember-950/40 text-ember-400' :
          'bg-red-950/40 text-red-400'
        }`}>
          {avg}
        </span>
      </div>

      <div className="space-y-1.5">
        <ScoreBar label="Accuracy" score={feedback.accuracy} />
        <ScoreBar label="Depth" score={feedback.depth} />
        <ScoreBar label="Clarity" score={feedback.clarity} />
      </div>

      {feedback.strengths.length > 0 && (
        <div className="space-y-1">
          {feedback.strengths.map((s, i) => (
            <p key={i} className="text-xs text-emerald-400/80 pl-3 border-l-2 border-emerald-500/30">
              {s}
            </p>
          ))}
        </div>
      )}

      {feedback.gaps.length > 0 && (
        <div className="space-y-1">
          {feedback.gaps.map((g, i) => (
            <p key={i} className="text-xs text-ember-400/80 pl-3 border-l-2 border-ember-500/30">
              {g}
            </p>
          ))}
        </div>
      )}

      {feedback.coaching && (
        <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-indigo-400/60 uppercase tracking-wider font-semibold mb-1">Coach tip</p>
          <p className="text-xs text-indigo-300/90 leading-relaxed italic">
            {feedback.coaching}
          </p>
        </div>
      )}
    </motion.div>
  )
}

export function AnalysisPanel({ analysis, isConnected }: Props) {
  return (
    <div className="h-full flex flex-col bg-surface-0/50 border-l border-surface-200/20">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-200/20 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-surface-400'}`} />
        <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wider">
          Live Analysis
        </h3>
        {analysis.isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />
            <span className="text-[10px] text-ember-400 uppercase tracking-wider">Grading...</span>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {analysis.history.length === 0 && !analysis.isAnalyzing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              <div className="w-10 h-10 rounded-full border border-surface-200/30 flex items-center justify-center mb-4">
                <div className="w-3 h-3 rounded-full bg-surface-300/40" />
              </div>
              <p className="text-sm text-surface-400 mb-1">Waiting for first answer...</p>
              <p className="text-xs text-surface-300">Scores will appear here in real-time</p>
            </motion.div>
          )}

          {[...analysis.history].reverse().map((feedback, i) => (
            <FeedbackCard
              key={`${feedback.question}-${analysis.history.length - 1 - i}`}
              feedback={feedback}
              index={i}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Summary footer */}
      {analysis.history.length > 0 && (
        <div className="px-5 py-3 border-t border-surface-200/20 bg-surface-50/30">
          <div className="flex items-center justify-between text-xs text-surface-400">
            <span>{analysis.history.length} answer{analysis.history.length !== 1 ? 's' : ''} graded</span>
            <span className="font-mono">
              Avg: {(
                analysis.history.reduce((sum, f) => sum + (f.accuracy + f.depth + f.clarity) / 3, 0)
                / analysis.history.length
              ).toFixed(1)}/5
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
