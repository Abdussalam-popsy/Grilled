import { useState } from 'react'
import type { AppScreen, Mode, CoachingTip } from './types'
import { ProfileSetup } from './components/ProfileSetup'
import { GoalInput } from './components/GoalInput'
import { ResourceConfirm } from './components/ResourceConfirm'
import { Session } from './components/Session'
import { GapReport } from './components/GapReport'
import { useGapReport } from './hooks/useGapReport'
import { saveSession } from './lib/sessionHistory'

function App() {
  const [screen, setScreen] = useState<AppScreen>('profile')
  const [mode] = useState<Mode>('interview')
  const [goal, setGoal] = useState('')
  const [userName, setUserName] = useState('')
  const [resumeContext, setResumeContext] = useState('')
  const [coachingHistory, setCoachingHistory] = useState<CoachingTip[]>([])
  const [sessionDuration, setSessionDuration] = useState(0)
  const gapReport = useGapReport()

  const handleProfileContinue = (name: string, resume: string) => {
    setUserName(name)
    setResumeContext(resume)
    setScreen('goal')
  }

  const handleGoalSubmit = (submittedGoal: string) => {
    setGoal(submittedGoal)
    setScreen('confirm')
  }

  const handleSessionEnd = async (transcript: string[], history: CoachingTip[], duration: number) => {
    setCoachingHistory(history)
    setSessionDuration(duration)
    setScreen('report')
    await gapReport.generate(transcript, mode, goal)
  }

  // Save to localStorage once the report is ready
  const handleReportReady = (readinessScore: number) => {
    saveSession({
      date: new Date().toISOString(),
      goal,
      role: goal,
      readinessScore,
      avgAccuracy: 0,
      avgDepth: 0,
      avgClarity: 0,
      duration: sessionDuration,
      questionCount: coachingHistory.length,
    })
  }

  const handleRestart = () => {
    setScreen('profile')
    setGoal('')
    setUserName('')
    setResumeContext('')
    setCoachingHistory([])
    setSessionDuration(0)
  }

  const resourceSummary = resumeContext
    ? `Resume uploaded. I'll use your resume context along with web grounding during the session.`
    : `No specific materials — I'll use my general knowledge and web grounding during the session.`

  switch (screen) {
    case 'profile':
      return <ProfileSetup onContinue={handleProfileContinue} />

    case 'landing':
    case 'goal':
      return (
        <GoalInput
          mode={mode}
          userName={userName}
          onSubmit={handleGoalSubmit}
          onBack={() => setScreen('profile')}
        />
      )

    case 'confirm':
      return (
        <ResourceConfirm
          summary={resourceSummary}
          isLoading={false}
          onConfirm={() => setScreen('session')}
          onBack={() => setScreen('goal')}
        />
      )

    case 'session':
      return (
        <Session
          mode={mode}
          goal={goal}
          resourceContext={resumeContext}
          userName={userName}
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
              <p className="text-surface-400 text-sm">Generating your dashboard</p>
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
        return (
          <GapReport
            report={gapReport.report}
            sessionDuration={sessionDuration}
            userName={userName}
            onRestart={handleRestart}
            onReportReady={handleReportReady}
          />
        )
      }
      return null

    default:
      return <ProfileSetup onContinue={handleProfileContinue} />
  }
}

export default App
