// One puzzle per calendar day in America/Los_Angeles. Puzzle numbers count from EPOCH (No. 1).
export const TIME_ZONE = 'America/Los_Angeles'
export const EPOCH = '2026-10-04' // No. 1. Chosen so that Thursday, Oct 15 2026 is No. 12.

const dtf = (() => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return null
  }
})()

/** YYYY-MM-DD for the given instant, in America/Los_Angeles. */
export function dateKey(d: Date = new Date()): string {
  if (dtf) {
    const parts = dtf.formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  }
  return d.toISOString().slice(0, 10)
}

export function todayKey(): string {
  return dateKey(new Date())
}

function toUTCDays(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function daysBetween(a: string, b: string): number {
  return toUTCDays(b) - toUTCDays(a)
}

export function puzzleNumber(key: string): number {
  return daysBetween(EPOCH, key) + 1
}

export function addDays(key: string, n: number): string {
  const days = toUTCDays(key) + n
  return new Date(days * 86_400_000).toISOString().slice(0, 10)
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  return addDays(key, 0) === key
}

/** "Thursday, Oct 15" */
export function formatLong(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "Oct 15, 2026" */
export function formatShort(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

/** "Oct 15" */
export function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
