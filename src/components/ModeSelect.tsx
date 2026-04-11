import type { Mode } from '../types'

interface Props {
  onSelect: (mode: Mode) => void
}

export function ModeSelect({ onSelect }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <h1 className="text-6xl font-bold tracking-tight mb-3">Grilled</h1>
        <p className="text-neutral-400 text-lg max-w-md">
          The prep partner that sees you, hears you, and knows the material.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => onSelect('interview')}
          className="group relative px-8 py-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-orange-500/50 hover:bg-neutral-900/80 transition-all duration-200 cursor-pointer"
        >
          <div className="text-3xl mb-2">💼</div>
          <div className="text-xl font-semibold mb-1">Interview Prep</div>
          <div className="text-sm text-neutral-400">Mock interviews with a sharp AI interviewer</div>
        </button>

        <button
          onClick={() => onSelect('exam')}
          className="group relative px-8 py-6 bg-neutral-900 border border-neutral-800 rounded-2xl hover:border-blue-500/50 hover:bg-neutral-900/80 transition-all duration-200 cursor-pointer"
        >
          <div className="text-3xl mb-2">📚</div>
          <div className="text-xl font-semibold mb-1">Exam Buddy</div>
          <div className="text-sm text-neutral-400">Oral exam practice with an AI professor</div>
        </button>
      </div>
    </div>
  )
}
