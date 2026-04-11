import { useState } from 'react'
import type { Mode } from '../types'

interface Props {
  mode: Mode
  onSubmit: (goal: string) => void
  onBack: () => void
}

export function GoalInput({ mode, onSubmit, onBack }: Props) {
  const [goal, setGoal] = useState('')

  const placeholder = mode === 'interview'
    ? 'e.g. "Google L4 Frontend Engineer interview tomorrow"'
    : 'e.g. "Biochemistry module exam on protein synthesis in 6 hours"'

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-neutral-500 hover:text-white transition-colors cursor-pointer"
      >
        ← Back
      </button>

      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-2">
          {mode === 'interview' ? 'What are you interviewing for?' : 'What are you studying for?'}
        </h2>
        <p className="text-neutral-400 mb-8">Describe your goal in plain English.</p>

        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={placeholder}
          className="w-full h-32 bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-white placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-600 transition-colors"
          autoFocus
        />

        <button
          onClick={() => goal.trim() && onSubmit(goal.trim())}
          disabled={!goal.trim()}
          className="mt-4 w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
