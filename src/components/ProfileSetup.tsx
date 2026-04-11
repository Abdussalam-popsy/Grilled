import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { extractTextFromPDF } from '../lib/pdf'

interface Props {
  onContinue: (name: string, resumeContext: string) => void
}

export function ProfileSetup({ onContinue }: Props) {
  const [name, setName] = useState('')
  const [resumeContext, setResumeContext] = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [resumeSummary, setResumeSummary] = useState('')

  const handleResumeUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    try {
      const text = await extractTextFromPDF(file)
      setResumeContext(text)
      setResumeFileName(file.name)

      // Generate a brief summary from the extracted text
      const lines = text.split('\n').filter(l => l.trim().length > 0)
      const preview = lines.slice(0, 5).join(' ').slice(0, 200)
      setResumeSummary(preview ? `Extracted from resume: "${preview}..."` : 'Resume uploaded successfully')
    } catch (err) {
      console.error('Failed to process resume:', err)
      setResumeSummary('Failed to extract text from PDF')
    }
    setIsProcessing(false)
  }, [])

  const handleSubmit = () => {
    if (!name.trim()) return
    onContinue(name.trim(), resumeContext)
  }

  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-ember-600/6 blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-ember-500 text-sm font-medium uppercase tracking-wider mb-3">
            Welcome to Grilled
          </p>
          <h2 className="font-display text-4xl md:text-5xl italic tracking-tight mb-3">
            Let's get you ready
          </h2>
          <p className="text-surface-500 mb-10 leading-relaxed">
            Tell us your name and optionally upload your resume for a personalized session.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Name input */}
          <div>
            <label className="block text-xs text-surface-400 uppercase tracking-wider font-medium mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              className="w-full bg-surface-50 border border-surface-200/60 rounded-xl px-5 py-4 text-white placeholder-surface-400 focus:outline-none focus:border-ember-600/50 focus:ring-1 focus:ring-ember-600/20 transition-all text-[15px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) handleSubmit()
              }}
              autoFocus
            />
          </div>

          {/* Resume upload */}
          <div>
            <label className="block text-xs text-surface-400 uppercase tracking-wider font-medium mb-2">
              Resume (optional)
            </label>
            {resumeFileName ? (
              <div className="bg-surface-50 border border-surface-200/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-500 text-sm">✓</span>
                  <span className="text-sm flex-1 truncate">{resumeFileName}</span>
                  <button
                    onClick={() => {
                      setResumeContext('')
                      setResumeFileName('')
                      setResumeSummary('')
                    }}
                    className="text-surface-400 hover:text-red-400 text-xs transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
                {resumeSummary && (
                  <p className="text-xs text-surface-400 leading-relaxed">{resumeSummary}</p>
                )}
              </div>
            ) : (
              <label className={`block border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isProcessing ? 'border-ember-500/40 bg-ember-600/5' : 'border-surface-200/40 hover:border-surface-300/60'
              }`}>
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin" />
                    <span className="text-surface-400 text-sm">Processing PDF...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-surface-400 text-sm mb-1">Drop your resume PDF here</p>
                    <p className="text-surface-300 text-xs">or click to browse</p>
                  </>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleResumeUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full py-3.5 bg-ember-600 text-white font-semibold rounded-xl hover:bg-ember-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer text-[15px] tracking-wide"
          >
            Continue
          </button>

          {!resumeFileName && (
            <button
              onClick={() => name.trim() && onContinue(name.trim(), '')}
              disabled={!name.trim()}
              className="w-full py-2 text-surface-400 hover:text-surface-500 text-sm transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
            >
              Skip resume — I'll go without
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
