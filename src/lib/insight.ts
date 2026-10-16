import { calibration, CONFIDENT } from './scoring'
import type { Claim, ClaimResult } from './types'
import { COPY } from '../tokens/copy'

export type Insight = { key: string; title: string; line: string; notes: string[] }

/** Results-row title, used by the insight lines too. */
export function shortTitle(c: Claim): string {
  if (c.shortTitle) return c.shortTitle
  const words = c.text.replace(/\.$/, '').split(' ')
  return words.length <= 6 ? words.join(' ') : words.slice(0, 6).join(' ') + '…'
}

// HUMAN: how far the average crowd guess on false claims must miss before we call it out.
const MISREAD_THRESHOLD = 12

/**
 * One behavioral takeaway from a finished day, derived from what the player actually did:
 * a headline about calibration (the target mechanism), then at most two notes about the
 * crowd (social proof, misperceived norms) or the election category.
 * Demo-crowd rooms are left out of every crowd note: they are not data about real people.
 */
export function dayInsight(claims: Claim[], results: ClaimResult[]): Insight {
  const I = COPY.insight
  const rows = results.map((r, i) => ({ r, c: claims[i] })).filter((x) => x.c)
  const right = rows.filter((x) => x.r.correct).length
  const cal = calibration(rows.filter((x) => x.r.confidence !== undefined).map((x) => ({ confidence: x.r.confidence!, correct: x.r.correct })))

  let head: Omit<Insight, 'notes'>
  if (!cal) head = { key: 'none', title: I.noConfidence.title, line: I.noConfidence.line(right) }
  else {
    const misses = rows.filter((x) => !x.r.correct && (x.r.confidence ?? 0) >= CONFIDENT)
    if (misses.length >= 2) head = { key: 'many-misses', title: I.manyMisses.title, line: I.manyMisses.line(misses.length) }
    else if (misses.length === 1) {
      const m = misses[0]
      head = { key: 'one-miss', title: I.oneMiss.title, line: I.oneMiss.line(m.r.confidence!, shortTitle(m.c), m.c.answer) }
    } else if (cal.verdict === 'over') head = { key: 'over', title: I.over.title, line: I.over.line(cal.pctRight, cal.meanConfidence) }
    else if (cal.verdict === 'under') head = { key: 'under', title: I.under.title, line: I.under.line(cal.pctRight, cal.meanConfidence) }
    else if (right === rows.length) head = { key: 'perfect', title: I.perfect.title, line: I.perfect.line() }
    else if (cal.kinds['hedged-miss'] > 0 && cal.kinds['hedged-miss'] === rows.length - right) head = { key: 'hedged', title: I.hedged.title, line: I.hedged.line() }
    else head = { key: 'calibrated', title: I.calibrated.title, line: I.calibrated.line(cal.pctRight, cal.meanConfidence) }
  }

  const notes: string[] = []
  const real = rows.filter((x) => x.c.room.kind !== 'illustrative')

  // Social proof: you went with a room whose larger side was wrong, or against it and were right.
  const roomLeanedWrong = (c: Claim) => (c.answer === 'false' ? c.room.pctTrue > c.room.pctFalse : c.room.pctFalse > c.room.pctTrue)
  const followed = real.find((x) => !x.r.correct && roomLeanedWrong(x.c))
  const bucked = real.find((x) => x.r.correct && roomLeanedWrong(x.c))
  if (followed) notes.push(I.followed(shortTitle(followed.c)))
  else if (bucked) notes.push(I.bucked(shortTitle(bucked.c)))

  // Misperceived norms: how many people you thought fall for the false claims, against the polls.
  const falses = real.filter((x) => x.c.answer === 'false')
  if (falses.length > 0) {
    const you = Math.round(falses.reduce((s, x) => s + x.r.guess, 0) / falses.length)
    const room = Math.round(falses.reduce((s, x) => s + x.c.room.pctTrue, 0) / falses.length)
    if (you - room >= MISREAD_THRESHOLD) notes.push(I.overestimated(you, room))
    else if (room - you >= MISREAD_THRESHOLD) notes.push(I.underestimated(you, room))
  }

  // Election rules: the category this deployment is for.
  const election = rows.filter((x) => x.c.category === 'election')
  if (notes.length < 2 && election.length >= 2) {
    const missed = election.filter((x) => !x.r.correct).length
    if (missed >= 2) notes.push(I.electionWeak(missed, election.length))
    else if (missed === 0 && right < rows.length) notes.push(I.electionStrong(election.length))
  }

  return { ...head, notes: notes.slice(0, 2) }
}
