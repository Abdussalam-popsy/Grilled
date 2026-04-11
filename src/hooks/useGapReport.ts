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

      if (!transcriptText.trim()) {
        throw new Error('No conversation transcript to analyze. Try having a longer session.')
      }

      const responseText = await generateGapReport(transcriptText, mode, goal)

      // Try to parse, handling potential markdown wrapping
      let cleaned = responseText.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const parsed = JSON.parse(cleaned) as GapReport
      setReport(parsed)
    } catch (err) {
      console.error('[GapReport] Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate gap report')
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { report, isGenerating, error, generate }
}
