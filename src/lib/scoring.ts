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

export function scoreClaim(claim: Claim, verdict: Verdict, guess: number, confidence?: number): ClaimResult {
  const error = Math.abs(Math.round(guess) - claim.room.pctTrue)
  return {
    claimId: claim.id,
    verdict,
    guess: Math.round(guess),
    correct: verdict === claim.answer,
    readPoints: readPoints(error),
    error,
    badge: badgeFor(claim, verdict),
    ...(confidence !== undefined ? { confidence } : {}),
  }
}

export function scoreDay(results: ClaimResult[]): { accuracy: number; read: number } {
  return {
    accuracy: results.filter((r) => r.correct).length,
    read: results.reduce((sum, r) => sum + r.readPoints, 0),
  }
}

/* ---- Confidence ----
 * After each verdict the player says how sure they are. Nothing is scored on it; it is a mirror.
 * The point (see the panel notes): students overrate how well they spot misinformation, so the
 * game shows how sure you felt next to how often you were right.
 */

// HUMAN: the four steps. 50 is the floor because a true/false call can't be less than a coin flip.
export const CONFIDENCE_LEVELS = [50, 70, 90, 100] as const

// HUMAN: how far felt-sure and actually-right can drift before we call it over- or underconfidence.
export const CALIBRATION_TOLERANCE = 10

/** A confident miss: you were at least this sure and still wrong. */
export const CONFIDENT = 90

export type CalibrationEntry = { confidence: number; correct: boolean }

export type CalibrationBucket = { level: number; n: number; right: number; pctRight: number | null }

export type Calibration = {
  n: number
  meanConfidence: number   // 0–100, rounded
  pctRight: number         // 0–100, rounded
  gap: number              // meanConfidence − pctRight; positive means overconfident
  verdict: 'over' | 'under' | 'calibrated'
  confidentMisses: number  // wrong calls made at ≥ CONFIDENT
  buckets: CalibrationBucket[]
}

export function calibration(entries: CalibrationEntry[]): Calibration | null {
  const rows = entries.filter((e) => Number.isFinite(e.confidence))
  if (rows.length === 0) return null
  const n = rows.length
  const meanConfidence = Math.round(rows.reduce((s, e) => s + e.confidence, 0) / n)
  const pctRight = Math.round((rows.filter((e) => e.correct).length / n) * 100)
  const gap = meanConfidence - pctRight
  const verdict = gap > CALIBRATION_TOLERANCE ? 'over' : gap < -CALIBRATION_TOLERANCE ? 'under' : 'calibrated'
  const confidentMisses = rows.filter((e) => e.confidence >= CONFIDENT && !e.correct).length
  const buckets = CONFIDENCE_LEVELS.map((level) => {
    const inB = rows.filter((e) => nearestLevel(e.confidence) === level)
    const right = inB.filter((e) => e.correct).length
    return { level, n: inB.length, right, pctRight: inB.length ? Math.round((right / inB.length) * 100) : null }
  })
  return { n, meanConfidence, pctRight, gap, verdict, confidentMisses, buckets }
}

function nearestLevel(c: number): number {
  return CONFIDENCE_LEVELS.reduce((best, l) => (Math.abs(l - c) < Math.abs(best - c) ? l : best), CONFIDENCE_LEVELS[0])
}
