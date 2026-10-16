import type { BadgeId, Claim, ClaimResult, DayScores, Verdict } from './types'

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
  const correct = verdict === claim.answer
  return {
    claimId: claim.id,
    verdict,
    guess: Math.round(guess),
    correct,
    readPoints: readPoints(error),
    surePoints: surePoints(confidence, correct),
    error,
    badge: badgeFor(claim, verdict),
    ...(confidence !== undefined ? { confidence } : {}),
  }
}

/* ---- The day's score ----
 * Truth is the core, calibration is meaningful, the crowd read is secondary:
 *   calls       10 per right call                       0 … 50
 *   confidence  surePoints summed                     −75 … +25
 *   read        crowd read (0–100) ÷ 4                   0 … 25
 * Total is clamped to 0–100. No strategy beats honest play: always saying 50% forfeits the
 * confidence points, always saying 100% loses 15 on every miss, and a perfect crowd read is
 * worth half of five right calls.
 */
export const CALL_POINTS = 10
export const READ_DIVISOR = 4

export function dayTotal(accuracy: number, read: number, sure: number): number {
  return Math.max(0, Math.min(100, accuracy * CALL_POINTS + sure + Math.round(read / READ_DIVISOR)))
}

export function scoreDay(results: ClaimResult[]): DayScores {
  const accuracy = results.filter((r) => r.correct).length
  const read = results.reduce((sum, r) => sum + r.readPoints, 0)
  const sure = results.reduce((sum, r) => sum + r.surePoints, 0)
  return { accuracy, read, sure, total: dayTotal(accuracy, read, sure) }
}

/** Fills sure/total for records saved before confidence was scored. */
export function withTotals(scores: DayScores, results?: ClaimResult[]): Required<DayScores> {
  const sure = scores.sure ?? (results ? results.reduce((s, r) => s + r.surePoints, 0) : 0)
  return { accuracy: scores.accuracy, read: scores.read, sure, total: scores.total ?? dayTotal(scores.accuracy, scores.read, sure) }
}

/* ---- Confidence ----
 * After each verdict the player says how sure they are. The target mechanism is overconfidence:
 * highly educated students tend to be surer they can spot misinformation than their accuracy
 * justifies. So confidence is scored with a proper scoring rule (Brier), shown on every reveal,
 * and summarized as felt-sure vs actually-right.
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
  kinds: Record<CallKind, number> // the four outcomes: sure or hedged × right or wrong
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
  const kinds: Record<CallKind, number> = { 'sure-right': 0, 'hedged-right': 0, 'hedged-miss': 0, 'confident-miss': 0 }
  for (const e of rows) kinds[callKind(e.confidence, e.correct)!]++
  return { n, meanConfidence, pctRight, gap, verdict, confidentMisses, buckets, kinds }
}

// HUMAN: the weight on confidence. 10 keeps a confident miss (−15) bigger than a right call (+10)
// without making one bad claim sink the day.
export const SURE_K = 10

/**
 * Confidence points from the Brier score of the stated probability, centred so a coin flip is 0.
 * 50%: 0 either way. 70%: +3 / −5. 90%: +5 / −11. 100%: +5 / −15.
 * Being certain earns no more than being pretty sure, and costs more when wrong.
 */
export function surePoints(confidence: number | undefined, correct: boolean): number {
  if (confidence === undefined || !Number.isFinite(confidence)) return 0
  const p = Math.max(0.5, Math.min(1, confidence / 100))
  const pRight = correct ? p : 1 - p
  const brier = 1 - 2 * (1 - pRight) ** 2
  return Math.round(SURE_K * (brier - 0.5)) || 0
}

/** The four calibration outcomes for one call. */
export type CallKind = 'sure-right' | 'hedged-right' | 'hedged-miss' | 'confident-miss'

export function callKind(confidence: number | undefined, correct: boolean): CallKind | undefined {
  if (confidence === undefined) return undefined
  if (correct) return confidence >= CONFIDENT ? 'sure-right' : 'hedged-right'
  return confidence >= CONFIDENT ? 'confident-miss' : 'hedged-miss'
}

function nearestLevel(c: number): number {
  return CONFIDENCE_LEVELS.reduce((best, l) => (Math.abs(l - c) < Math.abs(best - c) ? l : best), CONFIDENCE_LEVELS[0])
}
