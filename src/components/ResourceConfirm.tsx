interface Props {
  summary: string
  isLoading: boolean
  onConfirm: () => void
  onBack: () => void
}

export function ResourceConfirm({ summary, isLoading, onConfirm, onBack }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-neutral-500 hover:text-white transition-colors cursor-pointer"
      >
        ← Back
      </button>

      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-2">Ready to start</h2>
        <p className="text-neutral-400 mb-8">Here's what I'll use for your session.</p>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-6">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-neutral-600 border-t-white rounded-full animate-spin" />
              <span className="text-neutral-400">Searching for resources...</span>
            </div>
          ) : (
            <p className="text-neutral-300 whitespace-pre-wrap">{summary || 'No specific materials — I\'ll use my general knowledge for this session.'}</p>
          )}
        </div>

        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Let's go 🔥
        </button>
      </div>
    </div>
  )
}
