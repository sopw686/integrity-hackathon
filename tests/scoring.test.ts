import { describe, expect, it } from 'vitest'
import { badgeFor, calibration, readPoints, scoreClaim, scoreDay } from '../src/lib/scoring'
import type { Claim } from '../src/lib/types'

const base = (answer: 'true' | 'false', pctTrue: number, pctFalse: number): Claim => ({
  id: 'x',
  text: 'x',
  answer,
  room: { kind: 'national', label: 'U.S. adults', pctTrue, pctFalse, pctUnsure: 100 - pctTrue - pctFalse, source: 's', sourceUrl: 'https://x', fieldDates: 'd', n: 1 },
  truthSource: { label: 't', url: 'https://t', oneLine: 'o' },
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
    expect(scoreDay(r)).toEqual({ accuracy: 2, read: 20 + 0 + 16 })
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

  it('carries confidence through scoreClaim only when given', () => {
    const c = base('false', 26, 74)
    expect(scoreClaim(c, 'false', 30, 90).confidence).toBe(90)
    expect('confidence' in scoreClaim(c, 'false', 30)).toBe(false)
  })
})
