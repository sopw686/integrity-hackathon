import { dayClaims, getClaim, getDay } from './content'
import { addDays } from './day'
import { load } from './storage'
import { CONFIDENT } from './scoring'
import type { Claim, Verdict } from './types'

/**
 * Second Look: every confident miss (wrong at 90%+) comes back for a retest, spaced out.
 * High-confidence errors are the ones feedback corrects best (the hypercorrection effect), but
 * corrections fade and old errors return after a delay unless they are retrieved again. So a
 * confident miss returns 2 days later; once it's right, again 7 days after that; once it's right
 * twice it's fixed. A miss on a retest starts the spacing over.
 */
export const SPACING = [2, 7] as const

const KEY = 'read-the-room:second-look'

export type LookAttempt = { date: string; verdict: Verdict; confidence: number; correct: boolean }

export type LookItem = {
  claimId: string
  firstSeen: string        // date of the confident miss
  verdict: Verdict         // what the player said then
  confidence: number       // how sure they were then
  stage: number            // correct retests in a row; fixed when it reaches SPACING.length
  due: string              // next retest date (America/Los_Angeles)
  attempts: LookAttempt[]
}

export type LookState = Record<string, LookItem>

let memory: LookState = {}

function read(): LookState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return memory
    const parsed = JSON.parse(raw) as LookState
    if (!parsed || typeof parsed !== 'object') return memory
    memory = parsed
    return memory
  } catch {
    return memory
  }
}

function write(state: LookState): void {
  memory = state
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage off: keep the queue in memory for this visit
  }
}

/** Empties the queue (tests, and a future "reset my data"). */
export function clearSecondLook(): void {
  write({})
}

export function isFixed(item: LookItem): boolean {
  return item.stage >= SPACING.length
}

/** Adds every confident miss from completed, non-archive days that isn't queued yet. */
export function syncSecondLook(): LookState {
  const state = { ...read() }
  let changed = false
  for (const [date, rec] of Object.entries(load().days)) {
    if (!rec.completedAt || rec.archive || !rec.confidence) continue
    const day = getDay(date)
    if (!day) continue
    dayClaims(day).forEach((c, i) => {
      const conf = rec.confidence?.[i]
      const v = rec.answers[i]
      if (conf === undefined || v === undefined || conf < CONFIDENT || v === c.answer) return
      const prev = state[c.id]
      if (prev && prev.firstSeen >= date) return
      if (prev && !isFixed(prev)) return
      // A new confident miss, or a fixed claim missed again on a later day: queue it (again).
      state[c.id] = { claimId: c.id, firstSeen: date, verdict: v, confidence: conf, stage: 0, due: addDays(date, SPACING[0]), attempts: [] }
      changed = true
    })
  }
  if (changed) write(state)
  return state
}

/** Retests due on or before `today`, oldest first, whose claim still ships. */
export function dueSecondLooks(today: string): LookItem[] {
  return Object.values(syncSecondLook())
    .filter((it) => !isFixed(it) && it.due <= today && getClaim(it.claimId))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.firstSeen < b.firstSeen ? -1 : 1))
}

/** Scores one retest and schedules the next one. Returns the updated item. */
export function nextLook(item: LookItem, claim: Claim, today: string, verdict: Verdict, confidence: number): LookItem {
  const correct = verdict === claim.answer
  const stage = correct ? item.stage + 1 : 0
  const due = stage >= SPACING.length ? item.due : addDays(today, SPACING[stage])
  return { ...item, stage, due, attempts: [...item.attempts, { date: today, verdict, confidence, correct }] }
}

export function recordSecondLook(item: LookItem): void {
  write({ ...read(), [item.claimId]: item })
}

/** Confident misses scheduled from a finished day (for the results-screen note). */
export function queuedFrom(date: string): LookItem[] {
  return Object.values(syncSecondLook()).filter((it) => it.firstSeen === date && it.attempts.length === 0)
}

export function secondLookSummary(): { fixed: number; open: number } {
  const all = Object.values(syncSecondLook())
  return { fixed: all.filter(isFixed).length, open: all.filter((it) => !isFixed(it)).length }
}

/** For demos and the pitch video: two retests that never touch storage. */
export function demoLooks(today: string): LookItem[] {
  const ids: Array<[string, Verdict, number]> = [
    ['ca-mail-ballot-7-days', 'false', 90],
    ['signature-mismatch-no-notice', 'true', 100],
  ]
  return ids
    .filter(([id]) => getClaim(id))
    .map(([claimId, verdict, confidence]) => ({ claimId, firstSeen: addDays(today, -2), verdict, confidence, stage: 0, due: today, attempts: [] }))
}
