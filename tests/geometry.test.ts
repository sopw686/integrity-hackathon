import { describe, expect, it } from 'vitest'
import { DOTS, boundaryPath, boundaryLength, center, clampCount, describeRoom, dotKind, layout, playerDotIndex, roomCounts, rowProgress } from '../src/lib/geometry'

const L = layout(14, 6)

describe('geometry', () => {
  it('lays out a 10x10 grid with padding', () => {
    expect(L.size).toBe(L.pad * 2 + 10 * 14 + 9 * 6)
    expect(center(0, L)).toEqual({ x: L.pad + 7, y: L.pad + 7 })
    expect(center(11, L)).toEqual({ x: L.pad + 20 + 7, y: L.pad + 20 + 7 })
  })

  it('assigns kinds in reading order: true block, false block, unsure remainder', () => {
    const s = { pctTrue: 23, pctFalse: 60, pctUnsure: 17 }
    expect(dotKind(0, s)).toBe('true')
    expect(dotKind(22, s)).toBe('true')
    expect(dotKind(23, s)).toBe('false')
    expect(dotKind(82, s)).toBe('false')
    expect(dotKind(83, s)).toBe('unsure')
    expect(dotKind(99, s)).toBe('unsure')
  })

  it('keeps the true and unsure blocks exact when a published split sums to 99 or 101', () => {
    const splits = [
      { pctTrue: 43, pctFalse: 57, pctUnsure: 1 },
      { pctTrue: 20, pctFalse: 65, pctUnsure: 14 },
      { pctTrue: 25, pctFalse: 53, pctUnsure: 23 },
      { pctTrue: 54, pctFalse: 29, pctUnsure: 16 },
      { pctTrue: 49, pctFalse: 50, pctUnsure: 0 },
    ]
    for (const s of splits) {
      const n = { true: 0, false: 0, unsure: 0 }
      for (let i = 0; i < DOTS; i++) n[dotKind(i, s)]++
      expect(n.true).toBe(s.pctTrue)
      expect(n.unsure).toBe(clampCount(s.pctUnsure))
      expect(n.true + n.false + n.unsure).toBe(DOTS)
      expect(roomCounts(s)).toEqual({ t: n.true, f: n.false, u: n.unsure })
      expect(dotKind(playerDotIndex(s, 'false'), s)).toBe('false')
      expect(dotKind(playerDotIndex(s, 'true'), s)).toBe('true')
    }
  })

  it('draws a stepped boundary that wraps, not a straight vertical line', () => {
    const p = boundaryPath(23, L)
    // row 2, col 3: horizontal above row 2 from the right to x(3), down one row, then left.
    const segs = p.split(' L ')
    expect(segs).toHaveLength(4)
    expect(boundaryLength(23, L)).toBeGreaterThan(boundaryLength(20, L))
  })

  it('draws a single edge line at 0, 100 and row multiples', () => {
    expect(boundaryPath(0, L).split(' L ')).toHaveLength(2)
    expect(boundaryPath(100, L).split(' L ')).toHaveLength(2)
    expect(boundaryPath(30, L).split(' L ')).toHaveLength(2)
  })

  it('places the player dot on the verdict side next to the boundary', () => {
    const s = { pctTrue: 29, pctFalse: 55, pctUnsure: 16 }
    expect(playerDotIndex(s, 'true')).toBe(28)
    expect(playerDotIndex(s, 'false')).toBe(29)
    expect(playerDotIndex({ pctTrue: 0, pctFalse: 90, pctUnsure: 10 }, 'true')).toBe(0)
    expect(playerDotIndex({ pctTrue: 100, pctFalse: 0, pctUnsure: 0 }, 'false')).toBe(99)
    expect(playerDotIndex({ pctTrue: 40, pctFalse: 0, pctUnsure: 60 }, 'false')).toBe(40)
  })

  it('staggers rows in the reveal', () => {
    expect(rowProgress(0, 0, 0.07, 0.16)).toBe(0)
    expect(rowProgress(1, 9, 0.07, 0.16)).toBe(1)
    const mid = rowProgress(0.5, 4, 0.07, 0.16)
    expect(mid).toBeGreaterThan(0)
    expect(rowProgress(0.5, 9, 0.07, 0.16)).toBe(0)
  })

  it('describes the room in words', () => {
    expect(describeRoom({ pctTrue: 18, pctFalse: 70, pctUnsure: 12 }, 'U.S. adults')).toBe(
      '18 of 100 U.S. adults say true, 70 say false, 12 are unsure.',
    )
    expect(describeRoom({ pctTrue: 24, pctFalse: 75, pctUnsure: 1 }, 'U.S. adults')).toBe(
      '24 of 100 U.S. adults say true, 75 say false, 1 is unsure.',
    )
  })
})
