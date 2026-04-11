import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import type { Resource } from '../types'
import { extractTextFromPDF } from '../lib/pdf'

type InputMode = 'upload' | 'paste'

interface Props {
  onContinue: (resources: Resource[]) => void
  onAutoSearch: () => void
  onBack: () => void
}

export function ResourceUpload({ onContinue, onAutoSearch, onBack }: Props) {
  const [resources, setResources] = useState<Resource[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('upload')
  const [pastedText, setPastedText] = useState('')
  const [pasteCount, setPasteCount] = useState(0)

  const processFiles = useCallback(async (files: FileList) => {
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

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processFiles(e.target.files)
  }, [processFiles])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files.length) await processFiles(e.dataTransfer.files)
  }, [processFiles])

  const addPastedText = useCallback(() => {
    const trimmed = pastedText.trim()
    if (!trimmed) return
    setPasteCount(c => c + 1)
    setResources(prev => [...prev, {
      name: `Pasted text ${pasteCount + 1}`,
      type: 'text',
      content: trimmed,
    }])
    setPastedText('')
  }, [pastedText, pasteCount])

  const removeResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-ember-600/5 blur-[100px] pointer-events-none" />

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
            Add your materials
          </h2>
          <p className="text-surface-500 mb-8 leading-relaxed">
            Upload files, paste text, or let Gemini find what it needs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {/* Input mode tabs */}
          <div className="flex gap-1 mb-4 bg-surface-50 border border-surface-200/30 rounded-lg p-1">
            <button
              onClick={() => setInputMode('upload')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                inputMode === 'upload'
                  ? 'bg-surface-100 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-500'
              }`}
            >
              Upload files
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${
                inputMode === 'paste'
                  ? 'bg-surface-100 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-500'
              }`}
            >
              Paste text
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-ember-500 bg-ember-600/5'
                  : 'border-surface-200/40 hover:border-surface-300/60'
              }`}
            >
              <div className="text-3xl mb-3 opacity-60">
                {isProcessing ? '⏳' : '📄'}
              </div>
              <p className="text-surface-400 text-sm mb-4">
                {isProcessing ? 'Processing...' : 'Drop PDFs or text files here'}
              </p>
              <label className="inline-block px-5 py-2.5 bg-surface-100 border border-surface-200/50 rounded-lg cursor-pointer hover:bg-surface-200/50 transition-colors text-sm font-medium">
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
          ) : (
            <div className="space-y-3">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your notes, lecture content, study guide, or any text here..."
                rows={6}
                className="w-full bg-surface-50 border border-surface-200/60 rounded-xl p-4 text-white placeholder-surface-400 resize-none focus:outline-none focus:border-ember-600/50 focus:ring-1 focus:ring-ember-600/20 transition-all text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">
                  {pastedText.length > 0 ? `${(pastedText.length / 1000).toFixed(1)}k chars` : ''}
                </span>
                <button
                  onClick={addPastedText}
                  disabled={!pastedText.trim()}
                  className="px-5 py-2 bg-surface-100 border border-surface-200/50 rounded-lg text-sm font-medium hover:bg-surface-200/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Add text
                </button>
              </div>
            </div>
          )}

          {/* Uploaded files */}
          {resources.length > 0 && (
            <div className="mt-4 space-y-2">
              {resources.map((r, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-surface-50 border border-surface-200/30 rounded-lg px-4 py-3 text-sm"
                >
                  <span className="text-ember-500">✓</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="text-surface-400 text-xs tabular-nums">{(r.content.length / 1000).toFixed(1)}k chars</span>
                  <button
                    onClick={() => removeResource(i)}
                    className="text-surface-400 hover:text-red-400 transition-colors cursor-pointer ml-1"
                  >
                    ×
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          <button
            onClick={() => onContinue(resources)}
            className="mt-6 w-full py-3.5 bg-ember-600 text-white font-semibold rounded-xl hover:bg-ember-700 transition-all cursor-pointer text-[15px]"
          >
            {resources.length > 0 ? `Continue with ${resources.length} item${resources.length > 1 ? 's' : ''}` : 'Continue without materials'}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-surface-200/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-0 px-4 text-xs text-surface-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          <button
            onClick={onAutoSearch}
            className="w-full py-3.5 bg-surface-50 border border-surface-200/40 text-white font-medium rounded-xl hover:border-ember-600/30 hover:bg-surface-100/60 transition-all cursor-pointer text-[15px] flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ember-500">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Let Gemini find resources for me
          </button>
        </motion.div>
      </div>
    </div>
  )
}
