import { motion } from 'motion/react'
import type { Mode } from '../types'

interface Props {
  onSelect: (mode: Mode) => void
}

export function ModeSelect({ onSelect }: Props) {
  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-ember-600/8 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-ember-500/6 blur-[80px] pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16 text-center"
        >
          <h1 className="font-display text-8xl md:text-9xl tracking-tight text-ember-400 mb-4 italic">
            Grilled
          </h1>
          <p className="text-surface-500 text-lg max-w-sm mx-auto leading-relaxed font-light">
            The prep partner that sees you, hears you, and knows the material.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('interview')}
            className="group flex-1 relative px-8 py-8 bg-surface-50 border border-surface-200/50 rounded-2xl cursor-pointer transition-colors duration-300 hover:border-ember-600/40 hover:bg-surface-100/80 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-ember-600/0 to-ember-600/0 group-hover:from-ember-600/5 group-hover:to-transparent transition-all duration-300" />
            <div className="relative">
              <div className="text-2xl mb-3 opacity-80">💼</div>
              <div className="text-xl font-semibold mb-1.5 tracking-tight">Interview Prep</div>
              <div className="text-sm text-surface-500 leading-relaxed">
                Mock interviews with a sharp AI hiring manager
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect('exam')}
            className="group flex-1 relative px-8 py-8 bg-surface-50 border border-surface-200/50 rounded-2xl cursor-pointer transition-colors duration-300 hover:border-ember-600/40 hover:bg-surface-100/80 text-left"
          >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-ember-600/0 to-ember-600/0 group-hover:from-ember-600/5 group-hover:to-transparent transition-all duration-300" />
            <div className="relative">
              <div className="text-2xl mb-3 opacity-80">📚</div>
              <div className="text-xl font-semibold mb-1.5 tracking-tight">Exam Buddy</div>
              <div className="text-sm text-surface-500 leading-relaxed">
                Oral exam practice with a strict AI professor
              </div>
            </div>
          </motion.button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-12 text-xs text-surface-400 tracking-wide uppercase"
        >
          Powered by Gemini &middot; fal &middot; Gradium
        </motion.p>
      </div>
    </div>
  )
}
