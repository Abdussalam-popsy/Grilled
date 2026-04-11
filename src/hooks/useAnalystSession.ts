import { useRef, useState, useCallback, useEffect } from 'react'
import { GeminiLiveSession } from '../lib/gemini'
import { getAnalystInstruction } from '../lib/prompts'
import type { AnswerFeedback, AnalysisState } from '../types'

interface UseAnalystSessionReturn {
  analysis: AnalysisState
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
  const [analysis, setAnalysis] = useState<AnalysisState>({
    current: null,
    history: [],
    isAnalyzing: false,
  })

  // Accumulate text fragments for JSON parsing
  const textBufferRef = useRef('')
  const lastFedIndexRef = useRef(0)

  const tryParseJSON = useCallback((buffer: string): { parsed: AnswerFeedback | null; remaining: string } => {
    // Try to find a complete JSON object in the buffer
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
          // Validate it has expected fields
          if (
            typeof obj.accuracy === 'number' &&
            typeof obj.depth === 'number' &&
            typeof obj.clarity === 'number'
          ) {
            const feedback: AnswerFeedback = {
              question: obj.question ?? '',
              accuracy: obj.accuracy,
              depth: obj.depth,
              clarity: obj.clarity,
              strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
              gaps: Array.isArray(obj.gaps) ? obj.gaps : [],
              coaching: typeof obj.coaching === 'string' ? obj.coaching : '',
            }
            return { parsed: feedback, remaining: buffer.slice(i + 1) }
          }
        } catch {
          // Not valid JSON yet, continue
        }
        // Invalid JSON object, skip past it
        return { parsed: null, remaining: buffer.slice(i + 1) }
      }
    }

    // Incomplete JSON, keep accumulating
    return { parsed: null, remaining: buffer }
  }, [])

  const connect = useCallback((goal: string) => {
    const session = new GeminiLiveSession({
      onTextOutput: (text) => {
        textBufferRef.current += text
        // Try to parse accumulated text as JSON
        const { parsed, remaining } = tryParseJSON(textBufferRef.current)
        textBufferRef.current = remaining
        if (parsed) {
          setAnalysis(prev => ({
            current: parsed,
            history: [...prev.history, parsed],
            isAnalyzing: false,
          }))
        }
      },
      onReady: () => {
        console.log('[Gemini:Analyst] Setup complete')
        setIsReady(true)
      },
      onError: (err) => {
        console.error('[Gemini:Analyst] Error:', err)
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
    setAnalysis(prev => ({ ...prev, isAnalyzing: true }))
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
