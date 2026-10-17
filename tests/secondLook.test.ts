import { beforeEach, describe, expect, it } from 'vitest'

class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
;(globalThis as unknown as { window: unknown }).window = { localStorage: new MemoryStorage() }

const storage = await import('../src/lib/storage')
const content = await import('../src/lib/content')
const look = await import('../src/lib/secondLook')

const DATE = '2026-10-15'
const day = content.getDay(DATE)!
const claims = content.dayClaims(day)
const wrong = (i: number) => (claims[i].answer === 'true' ? 'false' : 'true')

function playDay(confidences: number[], answers: Array<'true' | 'false'>) {
  answers.forEach((v, i) => storage.recordLock(DATE, i, v, 50, 'stray', false, confidences[i]))
  storage.completeDay(DATE, { accuracy: 0, read: 0 }, false)
}

describe('second look', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear()
    storage.save({ version: 1, days: {}, streak: 0, lastPlayed: null })
    look.clearSecondLook()
  })

  it('queues only confident misses, due two days later', () => {
    // claim 0: wrong at 90 (queued). claim 1: wrong at 70 (hedged, not queued). The rest right.
    playDay([90, 70, 100, 100, 100], [wrong(0), wrong(1), claims[2].answer, claims[3].answer, claims[4].answer])
    expect(look.dueSecondLooks('2026-10-16')).toEqual([])
    const due = look.dueSecondLooks('2026-10-17')
    expect(due.map((d) => d.claimId)).toEqual([claims[0].id])
    expect(due[0].confidence).toBe(90)
    expect(look.queuedFrom(DATE)).toHaveLength(1)
  })

  it('spaces retests 2 then 7 days, and is fixed after two right in a row', () => {
    playDay([100, 50, 50, 50, 50], [wrong(0), claims[1].answer, claims[2].answer, claims[3].answer, claims[4].answer])
    let item = look.dueSecondLooks('2026-10-17')[0]
    item = look.nextLook(item, claims[0], '2026-10-17', claims[0].answer, 90)
    expect(item.stage).toBe(1)
    expect(item.due).toBe('2026-10-24')
    look.recordSecondLook(item)
    expect(look.dueSecondLooks('2026-10-23')).toEqual([])
    item = look.dueSecondLooks('2026-10-24')[0]
    item = look.nextLook(item, claims[0], '2026-10-24', claims[0].answer, 90)
    expect(look.isFixed(item)).toBe(true)
    look.recordSecondLook(item)
    expect(look.dueSecondLooks('2026-11-30')).toEqual([])
    expect(look.secondLookSummary()).toEqual({ fixed: 1, open: 0 })
  })

  it('a miss on a retest starts the spacing over', () => {
    playDay([100, 50, 50, 50, 50], [wrong(0), claims[1].answer, claims[2].answer, claims[3].answer, claims[4].answer])
    const item = look.nextLook(look.dueSecondLooks('2026-10-17')[0], claims[0], '2026-10-17', wrong(0), 100)
    expect(item.stage).toBe(0)
    expect(item.due).toBe('2026-10-19')
    expect(item.attempts).toHaveLength(1)
  })

  it('ignores archive days', () => {
    ;[0, 1, 2, 3, 4].forEach((i) => storage.recordLock(DATE, i, wrong(i), 50, 'stray', true, 100))
    storage.completeDay(DATE, { accuracy: 0, read: 0 }, true)
    expect(look.dueSecondLooks('2026-10-30')).toEqual([])
  })
})
