import { describe, expect, it } from 'vitest'
import { badgeFor, calibration, dayTotal, readPoints, scoreClaim, scoreDay, surePoints, withTotals } from '../src/lib/scoring'
import { dayInsight } from '../src/lib/insight'
import type { Claim } from '../src/lib/types'

const base = (answer: 'true' | 'false', pctTrue: number, pctFalse: number): Claim => ({
  id: 'x',
  text: 'x',
  answer,
  room: { kind: 'national', label: 'U.S. adults', pctTrue, pctFalse, pctUnsure: 100 - pctTrue - pctFalse, source: 's', sourceUrl: 'https://x', fieldDates: 'd', n: 1 },
  truthSource: { label: 't', url: 'https://t', oneLine: 'o' },
  lesson: { pattern: 'p', tip: 't' },
  category: 'science',
  difficulty: 1,
  status: 'verified',
})

describe('read points', () => {
  it('follows the bands', () => {
    expect(readPoints(0)).toBe(20)
    expect(readPoints(3)).toBe(20)
    expect(readPoints(4)).toBe(16)
    expect(readPoints(7)).toBe(16)
    expect(readPoints(8)).toBe(11)
    expect(readPoints(12)).toBe(11)
    expect(readPoints(13)).toBe(6)
    expect(readPoints(20)).toBe(6)
    expect(readPoints(21)).toBe(0)
  })
})

describe('badges', () => {
  it('in good company: right, majority right', () => {
    expect(badgeFor(base('false', 18, 70), 'false')).toBe('good-company')
  })
  it('fox: right, majority wrong', () => {
    expect(badgeFor(base('false', 60, 30), 'false')).toBe('fox')
  })
  it('sheep: wrong, majority wrong', () => {
    expect(badgeFor(base('false', 60, 30), 'true')).toBe('sheep')
  })
  it('stray: wrong, majority right', () => {
    expect(badgeFor(base('false', 18, 70), 'true')).toBe('stray')
  })
  it('split replaces good company and sheep within 45–55 on the truth side', () => {
    expect(badgeFor(base('true', 52, 40), 'true')).toBe('split')
    expect(badgeFor(base('true', 48, 45), 'false')).toBe('split')
    // fox and stray are untouched by the split rule
    expect(badgeFor(base('true', 48, 45), 'true')).toBe('fox')
    expect(badgeFor(base('true', 52, 40), 'false')).toBe('stray')
  })
  it('unsure counts toward neither side', () => {
    // 45 true, 10 false, 45 unsure; answer false → truth side share is 10 → majority wrong
    expect(badgeFor(base('false', 45, 10), 'false')).toBe('fox')
  })
})

describe('day score', () => {
  it('sums accuracy and read', () => {
    const c = base('false', 29, 55)
    const r = [scoreClaim(c, 'false', 29), scoreClaim(c, 'true', 50), scoreClaim(c, 'false', 36)]
    // calls 2×10, no confidence given, read 36 ÷ 4 = 9
    expect(scoreDay(r)).toEqual({ accuracy: 2, read: 20 + 0 + 16, sure: 0, total: 29 })
    expect(r[1].badge).toBe('stray')
  })
})

describe('confidence calibration', () => {
  it('returns null with nothing to measure', () => {
    expect(calibration([])).toBeNull()
  })

  it('flags overconfidence and counts confident misses', () => {
    const cal = calibration([
      { confidence: 100, correct: false },
      { confidence: 90, correct: false },
      { confidence: 90, correct: true },
      { confidence: 100, correct: true },
      { confidence: 70, correct: true },
    ])!
    expect(cal.meanConfidence).toBe(90)
    expect(cal.pctRight).toBe(60)
    expect(cal.gap).toBe(30)
    expect(cal.verdict).toBe('over')
    expect(cal.confidentMisses).toBe(2)
    expect(cal.buckets.find((b) => b.level === 90)).toEqual({ level: 90, n: 2, right: 1, pctRight: 50 })
    expect(cal.buckets.find((b) => b.level === 50)).toEqual({ level: 50, n: 0, right: 0, pctRight: null })
  })

  it('calls it calibrated within the tolerance, underconfident beyond it', () => {
    expect(calibration([{ confidence: 70, correct: true }, { confidence: 70, correct: true }, { confidence: 70, correct: false }])!.verdict).toBe('calibrated')
    expect(calibration([{ confidence: 50, correct: true }, { confidence: 50, correct: true }])!.verdict).toBe('under')
  })

  it('counts the four calibration outcomes', () => {
    const cal = calibration([
      { confidence: 100, correct: true },
      { confidence: 50, correct: true },
      { confidence: 70, correct: false },
      { confidence: 90, correct: false },
    ])!
    expect(cal.kinds).toEqual({ 'sure-right': 1, 'hedged-right': 1, 'hedged-miss': 1, 'confident-miss': 1 })
  })

  it('carries confidence through scoreClaim only when given', () => {
    const c = base('false', 26, 74)
    expect(scoreClaim(c, 'false', 30, 90).confidence).toBe(90)
    expect('confidence' in scoreClaim(c, 'false', 30)).toBe(false)
  })
})

describe('confidence points', () => {
  it('are zero at a coin flip and grow with confidence, but cost more when wrong', () => {
    expect(surePoints(50, true)).toBe(0)
    expect(surePoints(50, false)).toBe(0)
    expect([70, 90, 100].map((c) => surePoints(c, true))).toEqual([3, 5, 5])
    expect([70, 90, 100].map((c) => surePoints(c, false))).toEqual([-5, -11, -15])
    expect(surePoints(undefined, false)).toBe(0)
  })

  it('reward honest confidence: no single level wins at every accuracy', () => {
    const expected = (level: number, q: number) => q * surePoints(level, true) + (1 - q) * surePoints(level, false)
    const best = (q: number) => [50, 70, 90, 100].reduce((b, l) => (expected(l, q) > expected(b, q) ? l : b), 50)
    expect(best(0.5)).toBe(50)
    expect(best(0.75)).toBe(70)
    expect(best(0.95)).toBeGreaterThanOrEqual(90)
  })
})

describe('day total', () => {
  it('weights truth over the crowd and clamps to 0–100', () => {
    expect(dayTotal(5, 100, 25)).toBe(100)
    expect(dayTotal(0, 100, 0)).toBe(25) // a perfect crowd read is worth half of five right calls
    expect(dayTotal(0, 0, -75)).toBe(0)
  })

  it('always-50% forfeits the confidence points; always-100% pays for misses', () => {
    const c = base('false', 20, 70)
    const fifty = scoreDay([scoreClaim(c, 'false', 20, 50), scoreClaim(c, 'true', 20, 50)])
    const certain = scoreDay([scoreClaim(c, 'false', 20, 100), scoreClaim(c, 'true', 20, 100)])
    expect(fifty.sure).toBe(0)
    expect(certain.sure).toBe(5 - 15)
    expect(certain.total).toBeLessThan(fifty.total!)
  })

  it('fills totals for records saved before confidence was scored', () => {
    expect(withTotals({ accuracy: 3, read: 40 })).toEqual({ accuracy: 3, read: 40, sure: 0, total: 40 })
  })
})

describe('day insight', () => {
  const claimFor = (id: string, answer: 'true' | 'false', pctTrue: number, pctFalse: number, category: Claim['category'] = 'election'): Claim => ({
    ...base(answer, pctTrue, pctFalse),
    id,
    shortTitle: id,
    category,
  })

  it('leads with confident misses', () => {
    const cs = [claimFor('a', 'false', 60, 30), claimFor('b', 'true', 40, 50), claimFor('c', 'false', 10, 80)]
    const rs = [scoreClaim(cs[0], 'true', 60, 100), scoreClaim(cs[1], 'false', 40, 90), scoreClaim(cs[2], 'false', 10, 90)]
    const ins = dayInsight(cs, rs)
    expect(ins.key).toBe('many-misses')
    expect(ins.notes[0]).toMatch(/sided with more of the room than not/)
    expect(ins.notes.some((n) => /Election rules got you 2 of 3/.test(n))).toBe(true)
  })

  it('names the one confident miss and the truth', () => {
    const cs = [claimFor('photo-id', 'false', 41, 38), claimFor('b', 'true', 70, 20)]
    const ins = dayInsight(cs, [scoreClaim(cs[0], 'true', 40, 90), scoreClaim(cs[1], 'true', 70, 70)])
    expect(ins.key).toBe('one-miss')
    expect(ins.line).toMatch(/90% sure about “photo-id”. It was false/)
  })

  it('calls out a misread of how many people believe false claims', () => {
    const cs = [claimFor('a', 'false', 10, 85, 'health'), claimFor('b', 'false', 20, 75, 'health')]
    const ins = dayInsight(cs, [scoreClaim(cs[0], 'false', 60, 70), scoreClaim(cs[1], 'false', 50, 70)])
    expect(ins.notes.some((n) => /expected false claims to fool more people/.test(n))).toBe(true)
  })

  it('leaves demo crowds out of crowd notes', () => {
    const c = claimFor('a', 'false', 10, 85, 'health')
    c.room = { ...c.room, kind: 'illustrative' }
    expect(dayInsight([c], [scoreClaim(c, 'false', 70, 70)]).notes).toEqual([])
  })

  it('says how the fact-check was used, and stays quiet on days that never offered one', () => {
    const cs = [{ ...base('false', 60, 30), id: 'a', shortTitle: 'photo-id' }, { ...base('true', 40, 50), id: 'b', shortTitle: 'mail-7' }]
    const miss = [scoreClaim(cs[0], 'true', 40, 100), scoreClaim(cs[1], 'true', 50, 70)]
    expect(dayInsight(cs, miss).check).toMatch(/fact-check went unused, and “photo-id”/)
    expect(dayInsight(cs, miss, false).check).toBeUndefined()
    const used = [scoreClaim(cs[0], 'false', 40, 90), { ...scoreClaim(cs[1], 'true', 50, 100), checked: true }]
    expect(dayInsight(cs, used).check).toMatch(/spent your fact-check on “mail-7” and got it right/)
  })
})
