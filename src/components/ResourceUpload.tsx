import { useState, useCallback } from 'react'
import type { Resource } from '../types'
import { extractTextFromPDF } from '../lib/pdf'

interface Props {
  onContinue: (resources: Resource[]) => void
  onAutoSearch: () => void
  onBack: () => void
}

export function ResourceUpload({ onContinue, onAutoSearch, onBack }: Props) {
  const [resources, setResources] = useState<Resource[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    setIsProcessing(true)
    const newResources: Resource[] = []

    for (const file of Array.from(files)) {
      try {
        if (file.type === 'application/pdf') {
          const text = await extractTextFromPDF(file)
          newResources.push({ name: file.name, type: 'pdf', content: text })
        } else if (file.type.startsWith('text/')) {
          const text = await file.text()
          newResources.push({ name: file.name, type: 'text', content: text })
        }
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err)
      }
    }

    setResources(prev => [...prev, ...newResources])
    setIsProcessing(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (!files.length) return

    // Create a synthetic change event
    const input = document.createElement('input')
    input.type = 'file'
    const dt = new DataTransfer()
    for (const file of Array.from(files)) {
      dt.items.add(file)
    }
    input.files = dt.files
    handleFileUpload({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>)
  }, [handleFileUpload])

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-neutral-500 hover:text-white transition-colors cursor-pointer"
      >
        ← Back
      </button>

      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-bold mb-2">Add your materials</h2>
        <p className="text-neutral-400 mb-8">Upload PDFs or let Gemini find resources for you.</p>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center hover:border-neutral-500 transition-colors mb-4"
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="text-neutral-400 mb-3">Drag & drop files here</p>
          <label className="inline-block px-4 py-2 bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-700 transition-colors text-sm">
            Browse files
            <input
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Processing indicator */}
        {isProcessing && (
          <p className="text-neutral-400 text-sm mb-4 animate-pulse">Processing files...</p>
        )}

        {/* Uploaded resources list */}
        {resources.length > 0 && (
          <div className="mb-4 space-y-2">
            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-neutral-900 rounded-lg px-3 py-2 text-sm">
                <span className="text-green-400">✓</span>
                <span>{r.name}</span>
                <span className="text-neutral-600 ml-auto">{r.content.length} chars</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onContinue(resources)}
            className="flex-1 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
          >
            {resources.length > 0 ? 'Continue with these' : 'Skip — no materials'}
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-neutral-950 px-3 text-neutral-500">or</span>
          </div>
        </div>

        <button
          onClick={onAutoSearch}
          className="w-full py-3 bg-neutral-900 border border-neutral-800 text-white font-semibold rounded-xl hover:border-neutral-600 transition-all cursor-pointer"
        >
          🔍 Let Gemini find resources for me
        </button>
      </div>
    </div>
  )
}
