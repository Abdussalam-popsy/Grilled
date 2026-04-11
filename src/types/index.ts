export type Mode = 'interview' | 'exam'

export interface Resource {
  name: string
  type: 'pdf' | 'text' | 'url'
  content: string
}

export interface GapTopic {
  topic: string
  justification: string
}

export interface ShakyTopic {
  topic: string
  what_was_missing: string
}

export interface WeakTopic {
  topic: string
  correct_answer: string
  review_angle: string
}

export interface CramTopic {
  topic: string
  visual_description: string
  image_url?: string
}

export interface GapReport {
  strong: GapTopic[]
  shaky: ShakyTopic[]
  weak: WeakTopic[]
  readiness_score: number
  readiness_justification: string
  top_cram_topics: CramTopic[]
}

export interface AnswerFeedback {
  question: string
  accuracy: number
  depth: number
  clarity: number
  strengths: string[]
  gaps: string[]
  coaching: string
}

export interface AnalysisState {
  current: AnswerFeedback | null
  history: AnswerFeedback[]
  isAnalyzing: boolean
}

export type AppScreen = 'landing' | 'profile' | 'goal' | 'resources' | 'confirm' | 'session' | 'report'

export interface SessionState {
  mode: Mode
  goal: string
  resources: Resource[]
  contextSummary: string
  transcript: string[]
  gapReport: GapReport | null
  userName: string
  resumeContext: string
}

export interface SessionRecord {
  date: string
  goal: string
  role: string
  readinessScore: number
  avgAccuracy: number
  avgDepth: number
  avgClarity: number
  duration: number
  questionCount: number
}
