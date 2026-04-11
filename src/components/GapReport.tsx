import { useState, useEffect } from 'react'
import type { GapReport as GapReportType } from '../types'
import { generateStudyAidImage } from '../lib/fal'
import { generateVoiceDebrief } from '../lib/gradium'

interface Props {
  report: GapReportType
  onRestart: () => void
}

export function GapReport({ report, onRestart }: Props) {
  const [cramImages, setCramImages] = useState<Record<string, string>>({})
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioRef] = useState(() => new Audio())

  // Generate fal images for cram topics
  useEffect(() => {
    report.top_cram_topics.forEach(async (topic) => {
      try {
        const url = await generateStudyAidImage(topic.visual_description)
        setCramImages(prev => ({ ...prev, [topic.topic]: url }))
      } catch (err) {
        console.error(`Failed to generate image for ${topic.topic}:`, err)
      }
    })
  }, [report.top_cram_topics])

  // Generate Gradium voice debrief
  useEffect(() => {
    const summary = `Here's your session debrief. Your readiness score is ${report.readiness_score} out of 10. ${report.readiness_justification}. ` +
      `Your strong areas include ${report.strong.map(s => s.topic).join(', ')}. ` +
      (report.shaky.length > 0 ? `Topics you should review: ${report.shaky.map(s => s.topic).join(', ')}. ` : '') +
      (report.weak.length > 0 ? `Priority areas to study: ${report.weak.map(w => w.topic).join(', ')}.` : '')

    generateVoiceDebrief(summary)
      .then(url => setAudioUrl(url))
      .catch(err => console.error('Gradium TTS error:', err))
  }, [report])

  const toggleAudio = () => {
    if (!audioUrl) return
    if (isPlaying) {
      audioRef.pause()
      setIsPlaying(false)
    } else {
      audioRef.src = audioUrl
      audioRef.play()
      setIsPlaying(true)
      audioRef.onended = () => setIsPlaying(false)
    }
  }

  const scoreColor = report.readiness_score >= 7 ? 'text-green-400' :
    report.readiness_score >= 4 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Gap Report</h1>
          <div className="flex items-center justify-center gap-3">
            <span className={`text-6xl font-bold ${scoreColor}`}>
              {report.readiness_score}
            </span>
            <span className="text-2xl text-neutral-500">/10</span>
          </div>
          <p className="text-neutral-400 mt-2 max-w-md mx-auto">{report.readiness_justification}</p>
        </div>

        {/* Voice debrief */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={toggleAudio}
            disabled={!audioUrl}
            className="flex items-center gap-2 px-5 py-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-600 transition-colors disabled:opacity-30 cursor-pointer"
          >
            <span>{isPlaying ? '⏸' : '▶️'}</span>
            <span>{audioUrl ? 'Voice Debrief' : 'Generating audio...'}</span>
          </button>
        </div>

        {/* Strong topics */}
        {report.strong.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Strong
            </h2>
            <div className="space-y-2">
              {report.strong.map((t, i) => (
                <div key={i} className="bg-green-950/30 border border-green-900/50 rounded-xl px-4 py-3">
                  <div className="font-medium">{t.topic}</div>
                  <div className="text-sm text-green-400/70 mt-1">{t.justification}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shaky topics */}
        {report.shaky.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500" /> Needs Review
            </h2>
            <div className="space-y-2">
              {report.shaky.map((t, i) => (
                <div key={i} className="bg-yellow-950/30 border border-yellow-900/50 rounded-xl px-4 py-3">
                  <div className="font-medium">{t.topic}</div>
                  <div className="text-sm text-yellow-400/70 mt-1">{t.what_was_missing}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Weak topics */}
        {report.weak.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" /> Priority Review
            </h2>
            <div className="space-y-2">
              {report.weak.map((t, i) => (
                <div key={i} className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3">
                  <div className="font-medium">{t.topic}</div>
                  <div className="text-sm text-red-400/70 mt-1">
                    <strong>Correct answer:</strong> {t.correct_answer}
                  </div>
                  <div className="text-sm text-red-400/50 mt-1">
                    <strong>Review angle:</strong> {t.review_angle}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Visual cram cards */}
        {report.top_cram_topics.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-3">Visual Cram Cards</h2>
            <div className="grid gap-4">
              {report.top_cram_topics.map((t, i) => (
                <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-neutral-800">
                    <div className="font-medium">{t.topic}</div>
                  </div>
                  <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                    {cramImages[t.topic] ? (
                      <img
                        src={cramImages[t.topic]}
                        alt={`Study aid: ${t.topic}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-neutral-600 text-sm animate-pulse">Generating visual...</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Restart */}
        <div className="text-center pt-4 pb-10">
          <button
            onClick={onRestart}
            className="px-8 py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-all cursor-pointer"
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  )
}
