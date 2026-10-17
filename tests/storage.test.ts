import { beforeEach, describe, expect, it } from 'vitest'

// A minimal localStorage + window shim so the storage module can run under node.
class MemoryStorage {
  private m = new Map<string, string>()
  failWrites = false
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) {
    if (this.failWrites) throw new Error('QuotaExceededError')
    this.m.set(k, String(v))
  }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const local = new MemoryStorage()
;(globalThis as unknown as { window: unknown }).window = { localStorage: local }

const storage = await import('../src/lib/storage')

describe('storage and streaks', () => {
  beforeEach(() => {
    local.failWrites = false
    local.clear()
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

  it('never rewrites a completed day (a stale second tab)', () => {
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 20 }, false)
    const done = storage.getDay('2026-10-15')
    storage.recordLock('2026-10-15', 0, 'false', 10, 'sheep', false)
    storage.recordLock('2026-10-15', 1, 'false', 10, 'sheep', false)
    storage.completeDay('2026-10-15', { accuracy: 5, read: 100 }, false)
    expect(storage.getDay('2026-10-15')).toEqual(done)
    expect(storage.currentStreak('2026-10-15')).toBe(1)
  })

  it('never rewrites a slot that is already locked', () => {
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.recordLock('2026-10-15', 0, 'false', 10, 'sheep', false)
    const rec = storage.getDay('2026-10-15')
    expect(rec?.answers).toEqual(['true'])
    expect(rec?.guesses).toEqual([60])
    expect(rec?.badges).toEqual(['fox'])
  })

  it('a day finished after a later one never moves lastPlayed backwards', () => {
    storage.recordLock('2026-10-16', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-16', { accuracy: 1, read: 20 }, false)
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 20 }, false)
    expect(storage.load().lastPlayed).toBe('2026-10-16')
    expect(storage.currentStreak('2026-10-16')).toBe(1)
  })

  it('keeps newer in-memory progress while writes fail over older stored data', () => {
    storage.recordLock('2026-10-14', 0, 'true', 60, 'fox', false)
    storage.completeDay('2026-10-14', { accuracy: 1, read: 20 }, false)
    local.failWrites = true
    storage.recordLock('2026-10-15', 0, 'true', 60, 'fox', false)
    storage.recordLock('2026-10-15', 1, 'false', 40, 'sheep', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 30 }, false)
    expect(storage.getDay('2026-10-15')?.answers).toEqual(['true', 'false'])
    expect(storage.getDay('2026-10-15')?.completedAt).toBeTruthy()
    expect(storage.currentStreak('2026-10-15')).toBe(2)
    // Once a write succeeds again, storage is the source of truth once more.
    local.failWrites = false
    storage.recordLock('2026-10-16', 0, 'true', 60, 'fox', false)
    const stored = JSON.parse(local.getItem(storage.STORAGE_KEY)!)
    expect(Object.keys(stored.days).sort()).toEqual(['2026-10-14', '2026-10-15', '2026-10-16'])
    expect(storage.getDay('2026-10-15')?.completedAt).toBeTruthy()
  })

  it('drops malformed records and coerces streak and lastPlayed, keeping valid history', () => {
    const good = { answers: ['true'], guesses: [50], scores: { accuracy: 1, read: 20 }, badges: ['fox'], completedAt: '2026-10-13T20:00:00Z' }
    local.setItem(storage.STORAGE_KEY, JSON.stringify({
      version: 1,
      streak: -3.5,
      lastPlayed: 'yesterday',
      days: {
        '2026-10-13': good,
        '2026-10-14': { answers: ['true'], guesses: [50], badges: ['fox'], completedAt: 'x' }, // no scores
        '2026-10-12': { ...good, scores: { accuracy: 'one', read: 20 } },
        '2026-10-11': { ...good, badges: 'fox' },
        '2026-10-10': { ...good, completedAt: 12 },
        '2026-10-09': null,
        'not-a-date': good,
      },
    }))
    const s = storage.load()
    expect(Object.keys(s.days)).toEqual(['2026-10-13'])
    expect(s.streak).toBe(0)
    expect(s.lastPlayed).toBeNull()
    expect(() => storage.lifetime()).not.toThrow()
    expect(storage.lifetime().daysPlayed).toBe(1)
    expect(storage.getDay('2026-10-14')).toBeUndefined()
  })
})
