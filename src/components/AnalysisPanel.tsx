import { motion, AnimatePresence } from 'motion/react'
import type { CoachingState, CoachingTip } from '../types'

interface Props {
  analysis: CoachingState
  isConnected: boolean
  error?: string | null
}

function CoachingCard({ tip, isCurrent }: { tip: CoachingTip; isCurrent: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 space-y-3 transition-colors ${
        isCurrent
          ? 'bg-ember-950/30 border border-ember-500/20'
          : 'bg-surface-50/40 border border-surface-200/15 opacity-60'
      }`}
    >
      <p className={`text-xs uppercase tracking-wider font-medium ${
        isCurrent ? 'text-ember-400' : 'text-surface-400'
      }`}>
        {tip.question}
      </p>

      <ul className="space-y-2">
        {tip.hints.map((hint: string, i: number) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2"
          >
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
              isCurrent ? 'bg-ember-500' : 'bg-surface-400'
            }`} />
            <span className={`text-sm leading-snug ${
              isCurrent ? 'text-surface-600' : 'text-surface-400'
            }`}>
              {hint}
            </span>
          </motion.li>
        ))}
      </ul>

      {tip.key_terms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {tip.key_terms.map((term: string, i: number) => (
            <span
              key={i}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider ${
                isCurrent
                  ? 'bg-ember-500/15 text-ember-400'
                  : 'bg-surface-200/30 text-surface-400'
              }`}
            >
              {term}
            </span>
          ))}
        </div>
      )}

    </motion.div>
  )
}

export function AnalysisPanel({ analysis, isConnected, error }: Props) {
  return (
    <div className="h-full flex flex-col bg-surface-0/50 border-l border-surface-200/20">
      <div className="px-5 py-4 border-b border-surface-200/20 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-surface-400'}`} />
        <h3 className="text-sm font-medium text-surface-500 uppercase tracking-wider">
          Coaching
        </h3>
        {analysis.isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-auto flex items-center gap-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-ember-500 animate-pulse" />
            <span className="text-[10px] text-ember-400 uppercase tracking-wider">Thinking...</span>
          </motion.div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {analysis.history.length === 0 && !analysis.isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center py-12"
            >
              {!isConnected && error ? (
                <>
                  <div className="w-10 h-10 rounded-full border border-red-500/30 bg-red-950/30 flex items-center justify-center mb-4">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M9 6v4m0 2.5h.01M3.34 15h11.32c1.1 0 1.78-1.19 1.23-2.14L10.23 3.3c-.55-.95-1.91-.95-2.46 0L2.11 12.86c-.55.95.13 2.14 1.23 2.14z" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="text-sm text-red-400 mb-1">Analyst connection failed</p>
                  <p className="text-xs text-red-400/60 max-w-[200px] leading-relaxed">{error}</p>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full border border-surface-200/30 flex items-center justify-center mb-4">
                    <div className="w-3 h-3 rounded-full bg-surface-300/40" />
                  </div>
                  <p className="text-sm text-surface-400 mb-1">Waiting for first question...</p>
                  <p className="text-xs text-surface-300">Hints will appear here to help you answer</p>
                </>
              )}
            </motion.div>
          )}

          {[...analysis.history].reverse().map((tip, i) => (
            <CoachingCard
              key={`${tip.question}-${analysis.history.length - 1 - i}`}
              tip={tip}
              isCurrent={i === 0}
            />
          ))}
        </AnimatePresence>
      </div>

      {analysis.history.length > 0 && (
        <div className="px-5 py-3 border-t border-surface-200/20 bg-surface-50/30">
          <div className="flex items-center justify-between text-xs text-surface-400">
            <span>{analysis.history.length} question{analysis.history.length !== 1 ? 's' : ''} coached</span>
          </div>
        </div>
      )}
    </div>
  )
}
