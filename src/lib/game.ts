import { useCallback, useMemo, useState } from 'react'
import { dayClaims, getDay } from './content'
import { completeDay, getDay as getRecord, recordLock, resetDay } from './storage'
import { scoreClaim, scoreDay } from './scoring'
import type { Claim, ClaimResult, Day, Verdict } from './types'
import { track } from './track'

export type Phase = 'verdict' | 'sure' | 'read' | 'reveal' | 'done'

/** One fact-check a day: scarce, so the player has to decide which claim they're least sure of. */
export const CHECKS_PER_DAY = 1

export type Game = {
  day: Day | undefined
  claims: Claim[]
  index: number
  claim: Claim | undefined
  phase: Phase
  verdict: Verdict | undefined
  confidence: number | undefined
  guess: number
  checked: boolean         // the claim on screen has been fact-checked
  checksLeft: number
  results: ClaimResult[]
  current: ClaimResult | undefined
  setVerdict: (v: Verdict) => void
  setConfidence: (c: number) => void
  setGuess: (g: number) => void
  check: () => void
  lock: () => void
  next: () => void
  restart: () => void
}

function resultsFromRecord(claims: Claim[], date: string): ClaimResult[] {
  const rec = getRecord(date)
  if (!rec) return []
  const out: ClaimResult[] = []
  for (let i = 0; i < claims.length; i++) {
    const v = rec.answers[i]
    const g = rec.guesses[i]
    if (v == null || g == null) break
    const r = scoreClaim(claims[i], v, g, rec.confidence?.[i])
    out.push(rec.checked?.includes(i) ? { ...r, checked: true } : r)
  }
  return out
}

/**
 * Stored progress for a fresh game of `date`. A live day drops an archive-flagged record (an early
 * peek) so it can be played and counted; a record with every answer but no completedAt (left
 * during the last reveal) is completed here. Safe to run twice: the second pass finds it done.
 */
export function startGame(claims: Claim[], date: string, archive: boolean): ClaimResult[] {
  if (!archive && getRecord(date)?.archive) resetDay(date)
  const results = resultsFromRecord(claims, date)
  if (claims.length && results.length >= claims.length && !getRecord(date)?.completedAt) {
    completeDay(date, scoreDay(results), archive)
    track('day_complete', { date, archive })
  }
  return results
}

/**
 * One day's play. Verdict and guess are transient until Lock; each lock is persisted so
 * a refresh resumes at the next claim. Archive days never touch streak or stats.
 */
export function useGame(date: string, archive: boolean): Game {
  const day = useMemo(() => getDay(date), [date])
  const claims = useMemo(() => (day ? dayClaims(day) : []), [day])
  const [results, setResults] = useState<ClaimResult[]>(() => startGame(claims, date, archive))
  const [phase, setPhase] = useState<Phase>(() => (claims.length > 0 && (results.length >= claims.length || Boolean(getRecord(date)?.completedAt)) ? 'done' : 'verdict'))
  const [verdict, setVerdictState] = useState<Verdict | undefined>(undefined)
  const [confidence, setConfidenceState] = useState<number | undefined>(undefined)
  const [guess, setGuess] = useState(50)
  const [current, setCurrent] = useState<ClaimResult | undefined>(undefined)
  const [checked, setChecked] = useState(false)
  const checksLeft = Math.max(0, CHECKS_PER_DAY - results.filter((r) => r.checked).length - (checked ? 1 : 0))

  const index = Math.min(results.length, claims.length - 1)
  const claim = claims[index]

  const setVerdict = useCallback((v: Verdict) => {
    // Locks the verdict. It cannot be changed once "how sure" appears.
    if (phase !== 'verdict') return
    setVerdictState(v)
    setConfidenceState(undefined)
    setGuess(50)
    setPhase('sure')
  }, [phase])

  const setConfidence = useCallback((c: number) => {
    if (phase !== 'sure') return
    setConfidenceState(c)
    setPhase('read')
  }, [phase])

  const check = useCallback(() => {
    // Opens the authority for the claim on screen. Only before the verdict, and only while one is left.
    if (phase !== 'verdict' || checked || checksLeft <= 0 || !claim) return
    setChecked(true)
    track('fact_check', { claim: claim.id })
  }, [phase, checked, checksLeft, claim])

  const lock = useCallback(() => {
    if (phase !== 'read' || !claim || !verdict) return
    // Another tab may have moved on: resync from storage instead of revealing a lock that was never saved.
    const rec = getRecord(date)
    const stored = resultsFromRecord(claims, date)
    if (rec?.completedAt || stored.length !== results.length) {
      setResults(stored)
      setVerdictState(undefined)
      setConfidenceState(undefined)
      setChecked(false)
      setPhase(rec?.completedAt || stored.length >= claims.length ? 'done' : 'verdict')
      return
    }
    const scored = scoreClaim(claim, verdict, guess, confidence)
    const r = checked ? { ...scored, checked: true } : scored
    recordLock(date, results.length, verdict, guess, r.badge, archive, confidence, checked)
    track('claim_lock', { claim: claim.id, verdict, guess, checked, ...(confidence !== undefined ? { confidence } : {}) })
    // The last lock completes the day, so leaving during its reveal still counts.
    if (results.length + 1 >= claims.length) {
      completeDay(date, scoreDay([...results, r]), archive)
      track('day_complete', { date, archive })
    }
    setCurrent(r)
    setPhase('reveal')
  }, [phase, claim, verdict, confidence, guess, date, results, claims, archive, checked])

  const next = useCallback(() => {
    if (phase !== 'reveal' || !current) return
    const all = [...results, current]
    setResults(all)
    setCurrent(undefined)
    setVerdictState(undefined)
    setConfidenceState(undefined)
    setChecked(false)
    setPhase(all.length >= claims.length ? 'done' : 'verdict')
  }, [phase, current, results, claims.length])

  const restart = useCallback(() => {
    resetDay(date)
    setResults([])
    setCurrent(undefined)
    setVerdictState(undefined)
    setConfidenceState(undefined)
    setGuess(50)
    setChecked(false)
    setPhase('verdict')
  }, [date])

  return { day, claims, index, claim, phase, verdict, confidence, guess, checked, checksLeft, results, current, setVerdict, setConfidence, setGuess, check, lock, next, restart }
}
