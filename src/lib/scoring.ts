import type { BadgeId, Claim, ClaimResult, Verdict } from './types'

// HUMAN: the Read scoring bands. Tune after the first week of play data.
export const READ_BANDS: Array<{ maxError: number; points: number }> = [
  { maxError: 3, points: 20 },
  { maxError: 7, points: 16 },
  { maxError: 12, points: 11 },
  { maxError: 20, points: 6 },
]
export const READ_MAX_PER_CLAIM = 20

// HUMAN: the "Split" threshold (45–55 on the relevant side).
export const SPLIT_LOW = 45
export const SPLIT_HIGH = 55

export function readPoints(error: number): number {
  const e = Math.abs(error)
  for (const band of READ_BANDS) if (e <= band.maxError) return band.points
  return 0
}

/** Share of the room standing on the truth's side. */
export function truthSideShare(claim: Pick<Claim, 'answer' | 'room'>): number {
  return claim.answer === 'true' ? claim.room.pctTrue : claim.room.pctFalse
}

export function majorityRight(claim: Pick<Claim, 'answer' | 'room'>): boolean {
  return truthSideShare(claim) > 50
}

export function roomIsSplit(claim: Pick<Claim, 'answer' | 'room'>): boolean {
  const s = truthSideShare(claim)
  return s >= SPLIT_LOW && s <= SPLIT_HIGH
}

/**
 * Badge by your verdict and the room's majority on the truth side.
 * Split replaces In good company / Sheep when the room is within 45–55 (per the rules;
 * Fox and Stray are untouched by the split rule). HUMAN: this asymmetry is literal to the spec.
 */
export function badgeFor(claim: Pick<Claim, 'answer' | 'room'>, verdict: Verdict): BadgeId {
  const right = verdict === claim.answer
  const majRight = majorityRight(claim)
  let badge: BadgeId
  if (right && majRight) badge = 'good-company'
  else if (right && !majRight) badge = 'fox'
  else if (!right && !majRight) badge = 'sheep'
  else badge = 'stray'
  if ((badge === 'good-company' || badge === 'sheep') && roomIsSplit(claim)) return 'split'
  return badge
}

export function scoreClaim(claim: Claim, verdict: Verdict, guess: number): ClaimResult {
  const error = Math.abs(Math.round(guess) - claim.room.pctTrue)
  return {
    claimId: claim.id,
    verdict,
    guess: Math.round(guess),
    correct: verdict === claim.answer,
    readPoints: readPoints(error),
    error,
    badge: badgeFor(claim, verdict),
  }
}

export function scoreDay(results: ClaimResult[]): { accuracy: number; read: number } {
  return {
    accuracy: results.filter((r) => r.correct).length,
    read: results.reduce((sum, r) => sum + r.readPoints, 0),
  }
}
