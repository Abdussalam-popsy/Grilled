import { useState, useCallback, useRef } from 'react'
import { motion } from 'motion/react'
import type { Mode } from '../types'

interface TagGroup {
  label: string
  tags: string[]
}

const INTERVIEW_TAGS: TagGroup[] = [
  { label: 'Company', tags: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Stripe', 'Figma'] },
  { label: 'Role', tags: ['Frontend', 'Backend', 'Fullstack', 'System Design', 'Product', 'Behavioral', 'Data Science'] },
  { label: 'Level', tags: ['Junior', 'Mid-Level', 'Senior', 'Staff', 'L3', 'L4', 'L5'] },
]

const EXAM_TAGS: TagGroup[] = [
  { label: 'Subject', tags: ['Biochemistry', 'Computer Science', 'Physics', 'Economics', 'Law', 'Medicine', 'Mathematics', 'Psychology'] },
  { label: 'Exam type', tags: ['Final Exam', 'Midterm', 'Oral Exam', 'Module Test', 'Viva', 'Practical'] },
  { label: 'Timeframe', tags: ['Tomorrow', 'In 6 hours', 'In 2 days', 'Next week'] },
]

interface Props {
  mode: Mode
  onSubmit: (goal: string) => void
  onBack: () => void
}

export function GoalInput({ mode, onSubmit, onBack }: Props) {
  const [goal, setGoal] = useState('')
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const toggleListening = useCallback(() => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript
      setGoal(prev => prev ? `${prev} ${text}` : text)
      setSelectedTags(new Set())
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }, [isListening])

  const tagGroups = mode === 'interview' ? INTERVIEW_TAGS : EXAM_TAGS

  const placeholder = mode === 'interview'
    ? 'e.g. "Google L4 Frontend Engineer interview tomorrow"'
    : 'e.g. "Biochemistry exam on protein synthesis in 6 hours"'

  const heading = mode === 'interview'
    ? 'What are you interviewing for?'
    : 'What are you studying for?'

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) {
        next.delete(tag)
      } else {
        next.add(tag)
      }

      // Build goal text from selected tags
      const parts = Array.from(next)
      if (parts.length > 0) {
        if (mode === 'interview') {
          setGoal(parts.join(' ') + ' interview')
        } else {
          setGoal(parts.join(' '))
        }
      } else {
        setGoal('')
      }

      return next
    })
  }, [mode])

  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-ember-600/6 blur-[100px] pointer-events-none" />

      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        onClick={onBack}
        className="absolute top-8 left-8 text-surface-500 hover:text-white transition-colors cursor-pointer text-sm font-medium flex items-center gap-1.5 z-10"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back
      </motion.button>

      <div className="relative z-10 w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-ember-500 text-sm font-medium uppercase tracking-wider mb-3">
            {mode === 'interview' ? 'Interview Prep' : 'Exam Buddy'}
          </p>
          <h2 className="font-display text-4xl md:text-5xl italic tracking-tight mb-3">
            {heading}
          </h2>
          <p className="text-surface-500 mb-8 leading-relaxed">
            Tap tags to build your goal, or type freely below.
          </p>
        </motion.div>

        {/* Tag groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 space-y-4"
        >
          {tagGroups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + gi * 0.08 }}
            >
              <p className="text-xs text-surface-400 uppercase tracking-wider font-medium mb-2">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.tags.map(tag => {
                  const isSelected = selectedTags.has(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer border ${
                        isSelected
                          ? 'bg-ember-600/15 border-ember-600/40 text-ember-400'
                          : 'bg-transparent border-surface-200/30 text-surface-500 hover:border-surface-300/50 hover:text-surface-600'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Textarea */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative">
            <textarea
              value={goal}
              onChange={(e) => {
                setGoal(e.target.value)
                if (selectedTags.size > 0) {
                  setSelectedTags(new Set())
                }
              }}
              placeholder={placeholder}
              rows={3}
              className="w-full bg-surface-50 border border-surface-200/60 rounded-xl p-5 pr-14 text-white placeholder-surface-400 resize-none focus:outline-none focus:border-ember-600/50 focus:ring-1 focus:ring-ember-600/20 transition-all text-[15px] leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && goal.trim()) {
                  e.preventDefault()
                  onSubmit(goal.trim())
                }
              }}
            />
            <button
              type="button"
              onClick={toggleListening}
              className={`absolute right-3 top-3 w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isListening
                  ? 'bg-ember-600/20 text-ember-400 animate-pulse'
                  : 'bg-surface-100 text-surface-400 hover:text-white hover:bg-surface-200/80'
              }`}
              title="Dictate with voice"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1a2.5 2.5 0 0 0-2.5 2.5v4a2.5 2.5 0 0 0 5 0v-4A2.5 2.5 0 0 0 8 1Z" fill="currentColor"/>
                <path d="M3.5 6.5a.5.5 0 0 1 1 0 3.5 3.5 0 0 0 7 0 .5.5 0 0 1 1 0 4.5 4.5 0 0 1-4 4.473V13.5h2a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1h2v-2.527a4.5 4.5 0 0 1-4-4.473Z" fill="currentColor"/>
              </svg>
            </button>
          </div>

          <button
            onClick={() => goal.trim() && onSubmit(goal.trim())}
            disabled={!goal.trim()}
            className="mt-5 w-full py-3.5 bg-ember-600 text-white font-semibold rounded-xl hover:bg-ember-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer text-[15px] tracking-wide"
          >
            Continue
          </button>

          <p className="mt-4 text-center text-xs text-surface-400">
            Press Enter to continue
          </p>
        </motion.div>
      </div>
    </div>
  )
}
