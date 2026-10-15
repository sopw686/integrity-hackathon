import { useCallback, useMemo, useState } from 'react'
import { dayClaims, getDay } from './content'
import { completeDay, getDay as getRecord, recordLock, resetDay } from './storage'
import { scoreClaim, scoreDay } from './scoring'
import type { Claim, ClaimResult, Day, Verdict } from './types'
import { track } from './track'

export type Phase = 'verdict' | 'read' | 'reveal' | 'done'

export type Game = {
  day: Day | undefined
  claims: Claim[]
  index: number
  claim: Claim | undefined
  phase: Phase
  verdict: Verdict | undefined
  guess: number
  results: ClaimResult[]
  current: ClaimResult | undefined
  setVerdict: (v: Verdict) => void
  setGuess: (g: number) => void
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
    out.push(scoreClaim(claims[i], v, g))
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
  const [guess, setGuess] = useState(50)
  const [current, setCurrent] = useState<ClaimResult | undefined>(undefined)

  const index = Math.min(results.length, claims.length - 1)
  const claim = claims[index]

  const setVerdict = useCallback((v: Verdict) => {
    // Locks the verdict. It cannot be changed once the slider appears.
    if (phase !== 'verdict') return
    setVerdictState(v)
    setGuess(50)
    setPhase('read')
  }, [phase])

  const lock = useCallback(() => {
    if (phase !== 'read' || !claim || !verdict) return
    const r = scoreClaim(claim, verdict, guess)
    recordLock(date, results.length, verdict, guess, r.badge, archive)
    track('claim_lock', { claim: claim.id, verdict, guess })
    setCurrent(r)
    setPhase('reveal')
  }, [phase, claim, verdict, guess, date, results.length, archive])

  const next = useCallback(() => {
    if (phase !== 'reveal' || !current) return
    const all = [...results, current]
    setResults(all)
    setCurrent(undefined)
    setVerdictState(undefined)
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
    setGuess(50)
    setPhase('verdict')
  }, [date])

  return { day, claims, index, claim, phase, verdict, guess, results, current, setVerdict, setGuess, lock, next, restart }
}
