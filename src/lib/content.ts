import type { Claim, Day } from './types'

// All content is static JSON bundled at build time. No database, no runtime fetch.
// '_' files are templates: the validator skips them, so the app must too. Drafts arrive as null
// (vite.config.ts drops them at build time).
const claimModules = import.meta.glob<{ default: Claim | null }>(['../../content/claims/*.json', '!../../content/claims/_*.json'], { eager: true })
const dayModules = import.meta.glob<{ default: Day }>(['../../content/days/*.json', '!../../content/days/_*.json'], { eager: true })

const claims = new Map<string, Claim>()
for (const mod of Object.values(claimModules)) {
  const c = mod.default
  if (c && c.status === 'verified') claims.set(c.id, c)
}

const days = new Map<string, Day>()
for (const [path, mod] of Object.entries(dayModules)) {
  const d = mod.default
  const date = d.date ?? path.split('/').pop()!.replace(/\.json$/, '')
  days.set(date, { ...d, date })
}

export function getClaim(id: string): Claim | undefined {
  return claims.get(id)
}

export function allClaims(): Claim[] {
  return Array.from(claims.values())
}

export function getDay(date: string): Day | undefined {
  const d = days.get(date)
  if (!d) return undefined
  if (d.claims.length !== 5 || !d.claims.every((id) => claims.has(id))) return undefined
  return d
}

export function dayClaims(day: Day): Claim[] {
  return day.claims.map((id) => claims.get(id)!).filter(Boolean)
}

/** Dates that have a playable day, ascending. */
export function allDayDates(): string[] {
  return Array.from(days.keys())
    .filter((d) => getDay(d) !== undefined)
    .sort()
}

/** The day a claim most recently appeared on or before `before`, if any. */
export function dayForClaim(id: string, before: string): Day | undefined {
  const dates = allDayDates().filter((d) => d <= before && days.get(d)!.claims.includes(id))
  const last = dates[dates.length - 1]
  return last ? days.get(last) : undefined
}
