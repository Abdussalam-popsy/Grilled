import { useState } from 'react'
import type { AppScreen, Mode, Resource } from './types'
import { GoalInput } from './components/GoalInput'
import { ResourceUpload } from './components/ResourceUpload'
import { ResourceConfirm } from './components/ResourceConfirm'
import { Session } from './components/Session'
import { GapReport } from './components/GapReport'
import { useGapReport } from './hooks/useGapReport'

function App() {
  const [screen, setScreen] = useState<AppScreen>('goal')
  const [mode] = useState<Mode>('interview')
  const [goal, setGoal] = useState('')
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceSummary, setResourceSummary] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const gapReport = useGapReport()

  const handleGoalSubmit = (submittedGoal: string) => {
    setGoal(submittedGoal)
    setScreen('resources')
  }

  const handleResourcesContinue = (uploadedResources: Resource[]) => {
    setResources(uploadedResources)
    if (uploadedResources.length > 0) {
      const summary = uploadedResources.map(r => `- ${r.name} (${r.content.length} characters extracted)`).join('\n')
      setResourceSummary(summary)
    } else {
      setResourceSummary('')
    }
    setScreen('confirm')
  }

  const handleAutoSearch = () => {
    setIsSearching(true)
    // Gemini web grounding will be used in the session itself
    // For now, just move to confirm with a note that we'll use web grounding
    setResourceSummary('I\'ll use web grounding to search for relevant materials when the session starts.')
    setIsSearching(false)
    setScreen('confirm')
  }

  const getResourceContext = (): string => {
    if (resources.length === 0) return ''
    return resources.map(r => `--- ${r.name} ---\n${r.content}`).join('\n\n')
  }

  const handleSessionEnd = async (transcript: string[]) => {
    setScreen('report')
    await gapReport.generate(transcript, mode, goal)
  }

  const handleRestart = () => {
    setScreen('goal')
    setGoal('')
    setResources([])
    setResourceSummary('')
  }

  switch (screen) {
    case 'landing':
    case 'goal':
      return (
        <GoalInput
          mode={mode}
          onSubmit={handleGoalSubmit}
          onBack={() => setScreen('goal')}
        />
      )

    case 'resources':
      return (
        <ResourceUpload
          onContinue={handleResourcesContinue}
          onAutoSearch={handleAutoSearch}
          onBack={() => setScreen('goal')}
        />
      )

    case 'confirm':
      return (
        <ResourceConfirm
          summary={resourceSummary}
          isLoading={isSearching}
          onConfirm={() => setScreen('session')}
          onBack={() => setScreen('resources')}
        />
      )

    case 'session':
      return (
        <Session
          mode={mode}
          goal={goal}
          resourceContext={getResourceContext()}
          onEnd={handleSessionEnd}
        />
      )

    case 'report':
      if (gapReport.isGenerating) {
        return (
          <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-ember-600/6 blur-[100px] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-surface-300 border-t-ember-500 rounded-full animate-spin mb-6" />
              <p className="font-display text-2xl italic text-surface-600 mb-2">Analyzing your session...</p>
              <p className="text-surface-400 text-sm">Generating your gap report</p>
            </div>
          </div>
        )
      }
      if (gapReport.error) {
        return (
          <div className="grain min-h-screen bg-surface-0 text-white flex flex-col items-center justify-center px-6">
            <p className="text-red-400 mb-4 text-sm">Error: {gapReport.error}</p>
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-ember-600 text-white font-semibold rounded-xl hover:bg-ember-700 transition-colors cursor-pointer"
            >
              Start Over
            </button>
          </div>
        )
      }
      if (gapReport.report) {
        return <GapReport report={gapReport.report} onRestart={handleRestart} />
      }
      return null

    default:
      return (
        <GoalInput
          mode={mode}
          onSubmit={handleGoalSubmit}
          onBack={() => setScreen('goal')}
        />
      )
  }
}

export default App
