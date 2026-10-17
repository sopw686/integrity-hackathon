import type { BadgeId, DayRecord, DayScores, PersistedState, Verdict } from './types'
import { addDays } from './day'

export const STORAGE_KEY = 'read-the-room:v1'
const HOWTO_KEY = 'read-the-room:howto-seen'

const empty = (): PersistedState => ({ version: 1, days: {}, streak: 0, lastPlayed: null })

// In-memory fallback so the game plays with storage disabled (no streak, but playable).
let memory: PersistedState = empty()
let storageWorks: boolean | null = null

export function storageAvailable(): boolean {
  if (storageWorks !== null) return storageWorks
  try {
    const k = '__rtr_probe__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    storageWorks = true
  } catch {
    storageWorks = false
  }
  return storageWorks
}

export function hasSeenHowTo(): boolean {
  try {
    return window.localStorage.getItem(HOWTO_KEY) === '1'
  } catch {
    return true
  }
}

export function markHowToSeen(): void {
  try {
    window.localStorage.setItem(HOWTO_KEY, '1')
  } catch {
    /* ignore */
  }
}

export function load(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return memory
    const parsed = JSON.parse(raw) as Partial<PersistedState>
    if (!parsed || parsed.version !== 1 || typeof parsed.days !== 'object') return memory
    memory = { version: 1, days: parsed.days ?? {}, streak: parsed.streak ?? 0, lastPlayed: parsed.lastPlayed ?? null }
    return memory
  } catch {
    return memory
  }
}

export function save(state: PersistedState): void {
  memory = state
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage disabled or full: keep playing from memory
  }
}

export function getDay(date: string): DayRecord | undefined {
  return load().days[date]
}

/** Save partial progress (verdict + guess for one claim). */
export function recordLock(date: string, index: number, verdict: Verdict, guess: number, badge: BadgeId, archive: boolean, confidence?: number, checked?: boolean): DayRecord {
  const state = load()
  const prev = state.days[date] ?? { answers: [], guesses: [], scores: { accuracy: 0, read: 0 }, badges: [], archive }
  const answers = prev.answers.slice()
  const guesses = prev.guesses.slice()
  const badges = prev.badges.slice()
  answers[index] = verdict
  guesses[index] = guess
  badges[index] = badge
  const rec: DayRecord = { ...prev, answers, guesses, badges, archive: archive || prev.archive }
  if (confidence !== undefined) {
    const conf = (prev.confidence ?? []).slice()
    conf[index] = confidence
    rec.confidence = conf
  }
  // Always present on records made since the fact-check existed, so results can tell "unused" from "not offered".
  rec.checked = checked && !(prev.checked ?? []).includes(index) ? [...(prev.checked ?? []), index] : (prev.checked ?? [])
  state.days = { ...state.days, [date]: rec }
  save(state)
  return rec
}

export function completeDay(date: string, scores: DayScores, archive: boolean): PersistedState {
  const state = load()
  const prev = state.days[date]
  if (!prev) return state
  const rec: DayRecord = { ...prev, scores, completedAt: new Date().toISOString(), archive }
  const next: PersistedState = { ...state, days: { ...state.days, [date]: rec } }
  if (!archive && !prev.completedAt) {
    const yesterday = addDays(date, -1)
    if (state.lastPlayed === yesterday) next.streak = state.streak + 1
    else if (state.lastPlayed === date) next.streak = state.streak
    else next.streak = 1
    next.lastPlayed = date
  }
  save(next)
  return next
}

/** Archive days may be replayed; wipe the stored record first. */
export function resetDay(date: string): void {
  const state = load()
  if (!state.days[date]) return
  const days = { ...state.days }
  delete days[date]
  save({ ...state, days })
}

/** Streak as of `today`: a streak older than yesterday has lapsed. */
export function currentStreak(today: string): number {
  const s = load()
  if (!s.lastPlayed) return 0
  if (s.lastPlayed === today || s.lastPlayed === addDays(today, -1)) return s.streak
  return 0
}

export type Lifetime = {
  daysPlayed: number
  accuracyPct: number
  meanRead: number
  foxes: number
  sheep: number
  bestRead: { date: string; read: number } | null
  playedDates: string[]
}

export function lifetime(): Lifetime {
  const s = load()
  const done = Object.entries(s.days).filter(([, r]) => r.completedAt && !r.archive)
  let correct = 0
  let total = 0
  let readSum = 0
  let foxes = 0
  let sheep = 0
  let best: Lifetime['bestRead'] = null
  for (const [date, r] of done) {
    correct += r.scores.accuracy
    total += r.answers.length
    readSum += r.scores.read
    foxes += r.badges.filter((b) => b === 'fox').length
    sheep += r.badges.filter((b) => b === 'sheep').length
    if (!best || r.scores.read > best.read) best = { date, read: r.scores.read }
  }
  return {
    daysPlayed: done.length,
    accuracyPct: total ? Math.round((correct / total) * 100) : 0,
    meanRead: done.length ? Math.round(readSum / done.length) : 0,
    foxes,
    sheep,
    bestRead: best,
    playedDates: done.map(([d]) => d).sort(),
  }
}
