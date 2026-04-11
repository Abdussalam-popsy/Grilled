import { useState } from 'react'
import type { AppScreen, Mode, Resource } from './types'
import { ModeSelect } from './components/ModeSelect'
import { GoalInput } from './components/GoalInput'
import { ResourceUpload } from './components/ResourceUpload'
import { ResourceConfirm } from './components/ResourceConfirm'
import { Session } from './components/Session'
import { GapReport } from './components/GapReport'
import { useGapReport } from './hooks/useGapReport'

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [mode, setMode] = useState<Mode>('interview')
  const [goal, setGoal] = useState('')
  const [resources, setResources] = useState<Resource[]>([])
  const [resourceSummary, setResourceSummary] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const gapReport = useGapReport()

  const handleModeSelect = (selectedMode: Mode) => {
    setMode(selectedMode)
    setScreen('goal')
  }

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
    setScreen('landing')
    setMode('interview')
    setGoal('')
    setResources([])
    setResourceSummary('')
  }

  switch (screen) {
    case 'landing':
      return <ModeSelect onSelect={handleModeSelect} />

    case 'goal':
      return (
        <GoalInput
          mode={mode}
          onSubmit={handleGoalSubmit}
          onBack={() => setScreen('landing')}
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
          <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-neutral-600 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-neutral-400">Analyzing your session...</p>
          </div>
        )
      }
      if (gapReport.error) {
        return (
          <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6">
            <p className="text-red-400 mb-4">Error: {gapReport.error}</p>
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-white text-black font-semibold rounded-xl cursor-pointer"
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
      return <ModeSelect onSelect={handleModeSelect} />
  }
}

export default App
