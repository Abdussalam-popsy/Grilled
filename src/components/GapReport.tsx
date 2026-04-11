import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import type { GapReport as GapReportType } from '../types'
import { generateStudyImage } from '../lib/gemini'

interface Props {
  report: GapReportType
  onRestart: () => void
}

export function GapReport({ report, onRestart }: Props) {
  const [cramImages, setCramImages] = useState<Record<string, string>>({})
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  // Generate images for cram topics using Gemini
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

  return (
    <div className="grain min-h-screen bg-surface-0 text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-ember-600/4 blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-6 py-12 relative z-10">
        {/* Header with score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <p className="text-ember-500 text-sm font-medium uppercase tracking-wider mb-6">Session Complete</p>

          {/* Circular score */}
          <div className="relative inline-flex items-center justify-center mb-6">
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

          <h1 className="font-display text-4xl md:text-5xl italic tracking-tight mb-3">
            Gap Report
          </h1>
          <p className="text-surface-500 max-w-md mx-auto leading-relaxed text-[15px]">
            {report.readiness_justification}
          </p>
        </motion.div>

        {/* Strong topics */}
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

        {/* Shaky topics */}
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

        {/* Weak topics */}
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

        {/* Visual cram cards */}
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
