import { useRef, useState, useCallback, useEffect } from 'react'
import { GeminiLiveSession } from '../lib/gemini'
import { getAnalystInstruction } from '../lib/prompts'
import type { CoachingTip, CoachingState } from '../types'

interface UseAnalystSessionReturn {
  analysis: CoachingState
  connect: (goal: string) => void
  feedTranscript: (lines: string[]) => void
  disconnect: () => void
  isReady: boolean
  error: string | null
}

export function useAnalystSession(): UseAnalystSessionReturn {
  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<CoachingState>({
    current: null,
    history: [],
    isThinking: false,
  })

  const textBufferRef = useRef('')
  const lastFedIndexRef = useRef(0)

  const tryParseJSON = useCallback((buffer: string): { parsed: CoachingTip | null; remaining: string } => {
    const startIdx = buffer.indexOf('{')
    if (startIdx === -1) return { parsed: null, remaining: buffer }

    let braceCount = 0
    for (let i = startIdx; i < buffer.length; i++) {
      if (buffer[i] === '{') braceCount++
      if (buffer[i] === '}') braceCount--
      if (braceCount === 0) {
        const jsonStr = buffer.slice(startIdx, i + 1)
        try {
          const obj = JSON.parse(jsonStr)
          if (Array.isArray(obj.hints) && obj.hints.length > 0) {
            const tip: CoachingTip = {
              question: obj.question ?? '',
              hints: obj.hints,
              key_terms: Array.isArray(obj.key_terms) ? obj.key_terms : [],
            }
            return { parsed: tip, remaining: buffer.slice(i + 1) }
          }
        } catch {
          // Not valid JSON yet
        }
        return { parsed: null, remaining: buffer.slice(i + 1) }
      }
    }

    return { parsed: null, remaining: buffer }
  }, [])

  const connect = useCallback((goal: string) => {
    const session = new GeminiLiveSession({
      onTextOutput: (text) => {
        textBufferRef.current += text
        const { parsed, remaining } = tryParseJSON(textBufferRef.current)
        textBufferRef.current = remaining
        if (parsed) {
          setAnalysis(prev => ({
            current: parsed,
            history: [...prev.history, parsed],
            isThinking: false,
          }))
        }
      },
      onReady: () => {
        console.log('[Gemini:Coach] Setup complete')
        setIsReady(true)
      },
      onError: (err) => {
        console.error('[Gemini:Coach] Error:', err)
        setError(err)
      },
      onClose: () => {
        setIsReady(false)
      },
    })

    session.connect('interview', goal, '', {
      textOnly: true,
      systemInstruction: getAnalystInstruction(goal),
    })
    sessionRef.current = session
  }, [tryParseJSON])

  const feedTranscript = useCallback((lines: string[]) => {
    if (!sessionRef.current?.connected) {
      console.warn('[Analyst] feedTranscript called but session not connected')
      return
    }
    const newLines = lines.slice(lastFedIndexRef.current)
    if (newLines.length === 0) return

    lastFedIndexRef.current = lines.length
    setAnalysis(prev => ({ ...prev, isThinking: true }))
    sessionRef.current.sendText(newLines.join('\n'))
  }, [])

  const disconnect = useCallback(() => {
    sessionRef.current?.disconnect()
    sessionRef.current = null
    lastFedIndexRef.current = 0
    textBufferRef.current = ''
    setIsReady(false)
  }, [])

  useEffect(() => {
    return () => { disconnect() }
  }, [disconnect])

  return { analysis, connect, feedTranscript, disconnect, isReady, error }
}
