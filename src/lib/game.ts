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
    if (v === undefined || g === undefined) break
    const r = scoreClaim(claims[i], v, g, rec.confidence?.[i])
    out.push(rec.checked?.includes(i) ? { ...r, checked: true } : r)
  }
  return out
}

/**
 * One day's play. Verdict and guess are transient until Lock; each lock is persisted so
 * a refresh resumes at the next claim. Archive days never touch streak or stats.
 */
export function useGame(date: string, archive: boolean): Game {
  const day = useMemo(() => getDay(date), [date])
  const claims = useMemo(() => (day ? dayClaims(day) : []), [day])
  const [results, setResults] = useState<ClaimResult[]>(() => resultsFromRecord(claims, date))
  const [phase, setPhase] = useState<Phase>(() => (resultsFromRecord(claims, date).length >= claims.length && claims.length > 0 ? 'done' : 'verdict'))
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
    const scored = scoreClaim(claim, verdict, guess, confidence)
    const r = checked ? { ...scored, checked: true } : scored
    recordLock(date, results.length, verdict, guess, r.badge, archive, confidence, checked)
    track('claim_lock', { claim: claim.id, verdict, guess, checked, ...(confidence !== undefined ? { confidence } : {}) })
    setCurrent(r)
    setPhase('reveal')
  }, [phase, claim, verdict, confidence, guess, date, results.length, archive, checked])

  const next = useCallback(() => {
    if (phase !== 'reveal' || !current) return
    const all = [...results, current]
    setResults(all)
    setCurrent(undefined)
    setVerdictState(undefined)
    setConfidenceState(undefined)
    setChecked(false)
    if (all.length >= claims.length) {
      completeDay(date, scoreDay(all), archive)
      track('day_complete', { date, archive })
      setPhase('done')
    } else {
      setPhase('verdict')
    }
  }, [phase, current, results, claims.length, date, archive])

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
