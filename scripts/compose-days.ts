/**
 * Compose day files from the verified claim pool under the day rules, for a date range.
 *
 *   npx tsx scripts/compose-days.ts --from 2026-10-30 --to 2026-11-12 [--window 5] [--seed 12] [--restarts 400] [--force [--allow-past]]
 *
 * Rules enforced (same as validate-content.ts): five distinct claims; at most one election claim
 * naming a party or candidate; at least one true answer; at least one claim where the room majority
 * was wrong; categories not all the same; no claim on two days less than `window` days apart, in
 * either direction, counting every day file that is kept and every day composed in this run. The
 * window defaults to the validator's error window. Existing day files are kept unless --force; with
 * --force, days in [from, to] are rewritten, but not a day whose date has arrived (Pacific) unless
 * --allow-past is given too, because saved progress is stored by date and claim position. The
 * composer searches randomly with a seed and prints what it could not satisfy instead of writing a
 * bad day; it then writes nothing and exits 1. Reads content/ from the current directory.
 * HUMAN: day composition and order are a taste call; this script only finds a valid arrangement.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { NO_REPEAT_ERROR_DAYS, PARTY_RE, dateKeyLA, isValidDateKey } from './validate-content'

type Claim = { id: string; answer: 'true' | 'false'; category: string; status: string; text: string; room: { pctTrue: number; pctFalse: number } }
type Day = { date: string; claims: string[] }

const USAGE = 'usage: compose-days --from YYYY-MM-DD --to YYYY-MM-DD [--window N] [--seed N] [--restarts N] [--force [--allow-past]]'
const VALUED = ['from', 'to', 'window', 'seed', 'restarts']
const SWITCHES = ['force', 'allow-past']
const args = process.argv.slice(2)
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`)
  if (i >= 0) return args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : ''
  const eq = args.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.slice(name.length + 3) : dflt
}
const FROM = opt('from', '')
const TO = opt('to', '')
const WINDOW = Number(opt('window', String(NO_REPEAT_ERROR_DAYS)))
const RESTARTS = Number(opt('restarts', '400'))
let seed = Number(opt('seed', '12'))
const FORCE = args.includes('--force')
const ALLOW_PAST = args.includes('--allow-past')

const problems: string[] = []
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  const name = a.startsWith('--') ? a.slice(2).split('=')[0] : ''
  if (VALUED.includes(name)) {
    // Checked here, not after Number(): a missing --seed would otherwise run as seed 0.
    const inline = a.includes('=') ? a.slice(name.length + 3) : undefined
    const next = args[i + 1]
    if (inline !== undefined ? inline === '' : next === undefined || next.startsWith('--')) problems.push(`--${name} needs a value`)
    else if (inline === undefined) i++
  } else if (SWITCHES.includes(name)) {
    if (a !== `--${name}`) problems.push(`--${name} takes no value, got ${JSON.stringify(a)}`)
  } else problems.push(`unknown argument ${JSON.stringify(a)}`)
}
if (!isValidDateKey(FROM)) problems.push(`--from needs a real YYYY-MM-DD date, got ${JSON.stringify(FROM)}`)
if (!isValidDateKey(TO)) problems.push(`--to needs a real YYYY-MM-DD date, got ${JSON.stringify(TO)}`)
if (isValidDateKey(FROM) && isValidDateKey(TO) && FROM > TO) problems.push(`--from ${FROM} is after --to ${TO}`)
if (!Number.isInteger(WINDOW) || WINDOW < 1) problems.push('--window needs a positive integer')
if (!Number.isInteger(RESTARTS) || RESTARTS < 1) problems.push('--restarts needs a positive integer')
if (!Number.isInteger(seed)) problems.push('--seed needs an integer')
if (ALLOW_PAST && !FORCE) problems.push('--allow-past only applies with --force')
if (problems.length > 0) {
  for (const p of problems) console.error(`✗ ${p}`)
  console.error(USAGE)
  process.exit(2)
}

const rand = () => {
  // mulberry32
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const shuffle = <T,>(a: T[]) => {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const root = process.cwd()
const claimsDir = join(root, 'content/claims')
const daysDir = join(root, 'content/days')
const claims: Claim[] = readdirSync(claimsDir)
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim)
  .filter((c) => c.status === 'verified')

const partyElection = (c: Claim) => c.category === 'election' && PARTY_RE.test(c.text)
const majorityWrong = (c: Claim) => (c.answer === 'true' ? c.room.pctTrue : c.room.pctFalse) <= 50

const toDays = (k: string) => Math.floor(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 86400000)
const fromDays = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10)

// Templates ("_" files) are skipped, as the validator and the app skip them.
const existing = new Map<string, Day>()
for (const f of readdirSync(daysDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const d = JSON.parse(readFileSync(join(daysDir, f), 'utf8')) as Day
  const date = d.date ?? f.replace(/\.json$/, '')
  if (!isValidDateKey(date) || !Array.isArray(d.claims)) {
    console.error(`✗ content/days/${f} is not a day file the composer can read; fix it first (npm run validate)`)
    process.exit(2)
  }
  existing.set(date, d)
}

const rewrites = (date: string) => FORCE && date >= FROM && date <= TO
const today = dateKeyLA()
const arrived = [...existing.keys()].filter((date) => rewrites(date) && date <= today).sort()
if (arrived.length > 0 && !ALLOW_PAST) {
  console.error(
    `✗ --force would rewrite ${arrived.length} day file(s) dated on or before today (${today}, Pacific): ${arrived.join(', ')}.\n` +
      '  Saved progress is stored by date and claim position, so anyone who played them would see their answers on other claims.\n' +
      '  Start --from after today, or add --allow-past if nobody can have played them.',
  )
  process.exit(2)
}

// Every day number each claim appears on in the day files this run keeps (in-range files are
// dropped under --force because they are being rewritten). Checked in both directions.
const kept = new Map<string, number[]>()
for (const [date, d] of existing) {
  if (rewrites(date)) continue
  for (const id of d.claims) kept.set(id, [...(kept.get(id) ?? []), toDays(date)])
}

function validDay(set: Claim[]): string | null {
  if (set.length !== 5) return 'needs 5'
  if (set.filter(partyElection).length > 1) return 'two party/candidate election claims'
  if (!set.some((c) => c.answer === 'true')) return 'no true answer'
  if (!set.some(majorityWrong)) return 'no majority-wrong claim'
  if (new Set(set.map((c) => c.category)).size === 1) return 'all one category'
  return null
}

type Plan = { report: string[]; days: Day[]; failures: number }

function attempt(): Plan {
  const picked = new Map<string, number[]>() // claim id → day numbers chosen in this attempt
  const report: string[] = []
  const days: Day[] = []
  let failures = 0
  for (let d = toDays(FROM); d <= toDays(TO); d++) {
    const date = fromDays(d)
    if (existing.has(date) && !FORCE) {
      report.push(`${date}: kept existing`)
      continue
    }
    const clear = (id: string) => [...(kept.get(id) ?? []), ...(picked.get(id) ?? [])].every((x) => Math.abs(d - x) >= WINDOW)
    const pool = claims.filter((c) => clear(c.id))
    let best: Claim[] | null = null
    let why = 'pool too small'
    for (let a = 0; a < 300 && !best; a++) {
      const trues = shuffle(pool.filter((c) => c.answer === 'true'))
      const wrongs = shuffle(pool.filter(majorityWrong))
      const rest = shuffle(pool)
      const pick: Claim[] = []
      const add = (c?: Claim) => {
        if (c && !pick.includes(c)) pick.push(c)
      }
      add(trues[0])
      add(wrongs.find((c) => !pick.includes(c)))
      for (const c of rest) {
        if (pick.length >= 5) break
        if (partyElection(c) && pick.some(partyElection)) continue
        add(c)
      }
      const err = validDay(pick)
      if (!err) best = shuffle(pick)
      else why = err
    }
    if (!best) {
      failures++
      report.push(`${date}: COULD NOT COMPOSE (${why}; ${pool.length} eligible claims after the ${WINDOW}-day window)`)
      continue
    }
    for (const c of best) picked.set(c.id, [...(picked.get(c.id) ?? []), d])
    days.push({ date, claims: best.map((c) => c.id) })
    report.push(`${date}: ${best.map((c) => c.id).join(', ')}`)
  }
  return { report, days, failures }
}

// Whole-range restarts: a tight pool often has a valid arrangement that a single greedy pass misses.
let plan = attempt()
for (let r = 1; r < RESTARTS && plan.failures > 0; r++) {
  const next = attempt()
  if (next.failures < plan.failures) plan = next
  if (plan.failures === 0) break
}
const report = plan.report
let written = 0
if (plan.failures === 0) {
  for (const day of plan.days) {
    writeFileSync(join(daysDir, `${day.date}.json`), JSON.stringify(day, null, 2) + '\n')
    written++
  }
} else {
  report.push(`\nNo complete arrangement found in ${RESTARTS} restarts; nothing written. Add claims (especially majority-wrong and true ones) or lower --window.`)
}
console.log(report.join('\n'))
console.log(`\n${claims.length} verified claims in pool (${claims.filter((c) => c.answer === 'true').length} true); ${written} day files written.`)
if (plan.failures > 0) process.exit(1)
