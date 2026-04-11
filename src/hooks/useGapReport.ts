import { useState, useCallback } from 'react'
import type { GapReport, Mode } from '../types'
import { generateGapReport } from '../lib/gemini'

interface UseGapReportReturn {
  report: GapReport | null
  isGenerating: boolean
  error: string | null
  generate: (transcript: string[], mode: Mode, goal: string) => Promise<void>
}

export function useGapReport(): UseGapReportReturn {
  const [report, setReport] = useState<GapReport | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (transcript: string[], mode: Mode, goal: string) => {
    setIsGenerating(true)
    setError(null)

    try {
      const transcriptText = transcript.join('\n')
      const responseText = await generateGapReport(transcriptText, mode, goal)
      const parsed = JSON.parse(responseText) as GapReport
      setReport(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate gap report')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { report, isGenerating, error, generate }
}
