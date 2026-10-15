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
    if (v == null || g == null) break
    out.push(scoreClaim(claims[i], v, g))
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
    // Another tab may have moved on: resync from storage instead of revealing a lock that was never saved.
    const rec = getRecord(date)
    const stored = resultsFromRecord(claims, date)
    if (rec?.completedAt || stored.length !== results.length) {
      setResults(stored)
      setVerdictState(undefined)
      setPhase(rec?.completedAt || stored.length >= claims.length ? 'done' : 'verdict')
      return
    }
    const r = scoreClaim(claim, verdict, guess)
    recordLock(date, results.length, verdict, guess, r.badge, archive)
    track('claim_lock', { claim: claim.id, verdict, guess })
    // The last lock completes the day, so leaving during its reveal still counts.
    if (results.length + 1 >= claims.length) {
      completeDay(date, scoreDay([...results, r]), archive)
      track('day_complete', { date, archive })
    }
    setCurrent(r)
    setPhase('reveal')
  }, [phase, claim, verdict, guess, date, results, claims, archive])

  const next = useCallback(() => {
    if (phase !== 'reveal' || !current) return
    const all = [...results, current]
    setResults(all)
    setCurrent(undefined)
    setVerdictState(undefined)
    setPhase(all.length >= claims.length ? 'done' : 'verdict')
  }, [phase, current, results, claims.length])

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
