import type { SessionRecord } from '../types'

const STORAGE_KEY = 'grilled_sessions'
const MAX_SESSIONS = 50

export function saveSession(session: SessionRecord): void {
  const history = getHistory()
  const updated = [...history, session]
  // FIFO eviction — keep most recent 50
  const trimmed = updated.length > MAX_SESSIONS
    ? updated.slice(updated.length - MAX_SESSIONS)
    : updated
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (err) {
    console.error('[SessionHistory] Failed to save:', err)
  }
}

export function getHistory(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
