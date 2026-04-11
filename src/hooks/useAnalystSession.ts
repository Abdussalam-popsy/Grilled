import { useRef, useState, useCallback, useEffect } from 'react'
import { getAnalystInstruction } from '../lib/prompts'
import type { CoachingTip, CoachingState } from '../types'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

interface UseAnalystSessionReturn {
  analysis: CoachingState
  connect: (goal: string) => void
  feedTranscript: (lines: string[]) => void
  disconnect: () => void
  isReady: boolean
  error: string | null
}

export function useAnalystSession(): UseAnalystSessionReturn {
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CoachingState>({
    current: null,
    history: [],
    isThinking: false,
  })

  const goalRef = useRef('')
  const lastFedIndexRef = useRef(0)
  const activeRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const connect = useCallback((goal: string) => {
    goalRef.current = goal
    activeRef.current = true
    setIsReady(true)
    setError(null)
    console.log('[Analyst] Ready (REST mode)')
  }, [])

  const feedTranscript = useCallback(async (lines: string[]) => {
    if (!activeRef.current) return

    const newLines = lines.slice(lastFedIndexRef.current)
    if (newLines.length === 0) return
    lastFedIndexRef.current = lines.length

    // Only call the API when there's an interviewer question to coach on
    const hasQuestion = newLines.some(l => l.startsWith('Gemini:'))
    if (!hasQuestion) return

    // Cancel any previous in-flight request — newer question takes priority
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setAnalysis(prev => ({ ...prev, isThinking: true }))

    try {
      // Send recent transcript for context (last 20 lines)
      const context = lines.slice(-20).join('\n')
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: context }] }],
          systemInstruction: { parts: [{ text: getAnalystInstruction(goalRef.current) }] },
          generationConfig: { responseMimeType: 'application/json' },
        }),
      })

      if (!resp.ok) {
        const errorText = await resp.text()
        console.error('[Analyst] API error:', resp.status, errorText)
        setError(`Coaching API error: ${resp.status}`)
        setAnalysis(prev => ({ ...prev, isThinking: false }))
        return
      }

      const result = await resp.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        setAnalysis(prev => ({ ...prev, isThinking: false }))
        return
      }

      const obj = JSON.parse(text)
      if (Array.isArray(obj.hints) && obj.hints.length > 0) {
        const tip: CoachingTip = {
          question: obj.question ?? '',
          hints: obj.hints,
          key_terms: Array.isArray(obj.key_terms) ? obj.key_terms : [],
        }
        setAnalysis(prev => ({
          current: tip,
          history: [...prev.history, tip],
          isThinking: false,
        }))
        setError(null)
      } else {
        setAnalysis(prev => ({ ...prev, isThinking: false }))
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      console.error('[Analyst] Error:', err)
      setError(err instanceof Error ? err.message : 'Analyst error')
      setAnalysis(prev => ({ ...prev, isThinking: false }))
    }
  }, [])

  const disconnect = useCallback(() => {
    activeRef.current = false
    abortRef.current?.abort()
    abortRef.current = null
    lastFedIndexRef.current = 0
    setIsReady(false)
  }, [])

  useEffect(() => {
    return () => { disconnect() }
  }, [disconnect])

  return { analysis, connect, feedTranscript, disconnect, isReady, error }
}
