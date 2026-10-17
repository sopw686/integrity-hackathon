import { beforeEach, describe, expect, it } from 'vitest'

// A minimal localStorage + window shim so the storage module can run under node.
class MemoryStorage {
  private m = new Map<string, string>()
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, String(v)) }
  removeItem(k: string) { this.m.delete(k) }
  clear() { this.m.clear() }
}
const local = new MemoryStorage()
;(globalThis as unknown as { window: unknown }).window = { localStorage: local }

const storage = await import('../src/lib/storage')
const { startGame } = await import('../src/lib/game')
const { dayClaims, getDay } = await import('../src/lib/content')
const { scoreClaim } = await import('../src/lib/scoring')

const claimsFor = (date: string) => dayClaims(getDay(date)!)

/** Lock every claim of `date` as True at 50, the way useGame.lock used to: no completeDay. */
function lockAll(date: string, archive: boolean) {
  claimsFor(date).forEach((c, i) => storage.recordLock(date, i, 'true', 50, scoreClaim(c, 'true', 50).badge, archive))
}

describe('starting a game from storage', () => {
  beforeEach(() => {
    local.clear()
    storage.save({ version: 1, days: {}, streak: 0, lastPlayed: null })
  })

  it('completes a live day left during its last reveal, and credits the streak once', () => {
    storage.recordLock('2026-10-14', 0, 'true', 50, 'fox', false)
    storage.completeDay('2026-10-14', { accuracy: 1, read: 10 }, false)
    lockAll('2026-10-15', false)
    expect(storage.getDay('2026-10-15')?.completedAt).toBeUndefined()

    const claims = claimsFor('2026-10-15')
    // StrictMode runs the useState initialiser twice; the second pass must change nothing.
    const first = startGame(claims, '2026-10-15', false)
    const after = storage.load()
    const second = startGame(claims, '2026-10-15', false)
    expect(first).toHaveLength(5)
    expect(second).toEqual(first)
    expect(storage.load()).toEqual(after)
    expect(storage.getDay('2026-10-15')?.completedAt).toBeTruthy()
    expect(storage.load().lastPlayed).toBe('2026-10-15')
    expect(storage.currentStreak('2026-10-15')).toBe(2)
  })

  it('repairs a stuck past day as archive without moving lastPlayed backwards', () => {
    lockAll('2026-10-14', false)
    storage.recordLock('2026-10-15', 0, 'true', 50, 'fox', false)
    storage.completeDay('2026-10-15', { accuracy: 1, read: 10 }, false)
    const results = startGame(claimsFor('2026-10-14'), '2026-10-14', true)
    expect(results).toHaveLength(5)
    expect(storage.getDay('2026-10-14')?.completedAt).toBeTruthy()
    expect(storage.getDay('2026-10-14')?.archive).toBe(true)
    expect(storage.load().lastPlayed).toBe('2026-10-15')
    expect(storage.currentStreak('2026-10-15')).toBe(1)
  })

  it('drops an archive-flagged record (an early peek) when the day is played live', () => {
    lockAll('2026-10-16', true)
    storage.completeDay('2026-10-16', { accuracy: 1, read: 10 }, true)
    expect(startGame(claimsFor('2026-10-16'), '2026-10-16', false)).toEqual([])
    expect(storage.getDay('2026-10-16')).toBeUndefined()
  })

  it('keeps an archive record when it is opened as archive', () => {
    lockAll('2026-10-10', true)
    storage.completeDay('2026-10-10', { accuracy: 1, read: 10 }, true)
    const done = storage.getDay('2026-10-10')
    expect(startGame(claimsFor('2026-10-10'), '2026-10-10', true)).toHaveLength(5)
    expect(storage.getDay('2026-10-10')).toEqual(done)
  })

  it('resumes partial progress and leaves it incomplete', () => {
    const claims = claimsFor('2026-10-15')
    storage.recordLock('2026-10-15', 0, 'true', 50, 'fox', false)
    storage.recordLock('2026-10-15', 1, 'false', 30, 'sheep', false)
    const results = startGame(claims, '2026-10-15', false)
    expect(results.map((r) => r.claimId)).toEqual([claims[0].id, claims[1].id])
    expect(storage.getDay('2026-10-15')?.completedAt).toBeUndefined()
  })

  it('stops at a null hole instead of scoring it as an answer', () => {
    const rec = { answers: [null, null, 'true'], guesses: [null, null, 50], scores: { accuracy: 0, read: 0 }, badges: [null, null, 'fox'] }
    local.setItem(storage.STORAGE_KEY, JSON.stringify({ version: 1, days: { '2026-10-15': rec }, streak: 0, lastPlayed: null }))
    expect(startGame(claimsFor('2026-10-15'), '2026-10-15', false)).toEqual([])
  })
})
