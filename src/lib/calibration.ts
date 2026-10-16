import { dayClaims, getDay } from './content'
import { load } from './storage'
import { calibration, type Calibration, type CalibrationEntry } from './scoring'

/** Every completed, non-archive call that carries a confidence, scored against its claim. */
export function lifetimeCalibration(): Calibration | null {
  const entries: CalibrationEntry[] = []
  for (const [date, rec] of Object.entries(load().days)) {
    if (!rec.completedAt || rec.archive || !rec.confidence) continue
    const day = getDay(date)
    if (!day) continue
    const claims = dayClaims(day)
    claims.forEach((c, i) => {
      const conf = rec.confidence?.[i]
      const v = rec.answers[i]
      if (conf === undefined || v === undefined) return
      entries.push({ confidence: conf, correct: v === c.answer })
    })
  }
  return calibration(entries)
}
