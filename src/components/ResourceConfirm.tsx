import { motion } from 'motion/react'

interface Props {
  summary: string
  isLoading: boolean
  onConfirm: () => void
  onBack: () => void
}

export function ResourceConfirm({ summary, isLoading, onConfirm, onBack }: Props) {
  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-ember-600/6 blur-[100px] pointer-events-none" />

      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="absolute top-8 left-8 text-surface-500 hover:text-white transition-colors cursor-pointer text-sm font-medium flex items-center gap-1.5 z-10"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </motion.button>

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-4xl md:text-5xl italic tracking-tight mb-3">
            Ready to start
          </h2>
          <p className="text-surface-500 mb-8 leading-relaxed">
            Here's what I'll use for your session.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="bg-surface-50 border border-surface-200/30 rounded-xl p-6 mb-8">
            {isLoading ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin" />
                <span className="text-surface-400 text-sm">Searching for resources...</span>
              </div>
            ) : (
              <p className="text-surface-600 text-[15px] leading-relaxed whitespace-pre-wrap">
                {summary || "No specific materials — I'll use my general knowledge and web grounding during the session."}
              </p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            disabled={isLoading}
            className="w-full py-4 bg-ember-600 text-white font-bold text-lg rounded-xl hover:bg-ember-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer tracking-wide"
          >
            Let's go
          </motion.button>

          <p className="mt-4 text-center text-xs text-surface-400">
            Camera & microphone access will be requested
          </p>
        </motion.div>
      </div>
    </div>
  )
}
