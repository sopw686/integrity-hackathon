import { beforeEach, describe, expect, it } from 'vitest'

// A minimal localStorage + window shim so the storage module can run under node.
class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
;(globalThis as unknown as { window: unknown }).window = { localStorage: new MemoryStorage() }

const storage = await import('../src/lib/storage')

describe('storage and streaks', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { window: { localStorage: MemoryStorage } }).window.localStorage.clear()
    storage.save({ version: 1, days: {}, streak: 0, lastPlayed: null })
  })

  it('records locks and completes a day with a streak of 1', () => {
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 20 }, false)
    expect(storage.getDay('2026-10-15')?.completedAt).toBeTruthy()
    expect(storage.currentStreak('2026-10-15')).toBe(1)
  })

  it('saves how sure the player was, per claim, and leaves older records without it', () => {
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false, 90)
    storage.recordLock('2026-10-15', 1, 'false', 40, 'stray', false, 50)
    expect(storage.getDay('2026-10-15')?.confidence).toEqual([90, 50])
    storage.recordLock('2026-10-14', 0, 'true', 60, 'fox', false)
    expect(storage.getDay('2026-10-14')?.confidence).toBeUndefined()
  })

  it('extends the streak on consecutive days and lapses after a gap', () => {
    storage.recordLock('2026-10-14', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-14', { accuracy: 1, read: 20 }, false)
    storage.recordLock('2026-10-15', 0, 'false', 30, 'sheep', false)
    storage.completeDay('2026-10-15', { accuracy: 0, read: 0 }, false)
    expect(storage.currentStreak('2026-10-15')).toBe(2)
    expect(storage.currentStreak('2026-10-16')).toBe(2) // yesterday still counts
    expect(storage.currentStreak('2026-10-18')).toBe(0) // lapsed
  })

  it('archive plays never touch streak or lifetime stats', () => {
    storage.recordLock('2026-10-10', 0, 'true', 60, 'fox', true)
    storage.completeDay('2026-10-10', { accuracy: 1, read: 20 }, true)
    expect(storage.currentStreak('2026-10-15')).toBe(0)
    expect(storage.lifetime().daysPlayed).toBe(0)
    expect(storage.lifetime().foxes).toBe(0)
  })

  it('aggregates lifetime stats', () => {
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.recordLock('2026-10-15', 1, 'true', 60, 'sheep', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 26 }, false)
    const life = storage.lifetime()
    expect(life.daysPlayed).toBe(1)
    expect(life.accuracyPct).toBe(50)
    expect(life.meanRead).toBe(26)
    expect(life.foxes).toBe(1)
    expect(life.sheep).toBe(1)
    expect(life.bestRead).toEqual({ date: '2026-10-15', read: 26 })
  })

  it('resets an archive day for replay', () => {
    storage.recordLock('2026-10-10', 0, 'true', 60, 'fox', true)
    storage.resetDay('2026-10-10')
    expect(storage.getDay('2026-10-10')).toBeUndefined()
  })
})
