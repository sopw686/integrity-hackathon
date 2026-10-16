/**
 * Compose day files from the verified claim pool under the day rules, for a date range.
 *
 *   npx tsx scripts/compose-days.ts --from 2026-10-04 --to 2026-10-29 [--window 7] [--seed 12] [--restarts 400] [--force]
 *     [--election N]   at least N election claims per day (the Claremont deployment uses 3)
 *     [--skip a,b,c]   leave these claims out of the pool (e.g. ones too easy for the demo)
 *
 * Rules enforced (same as validate-content.ts): five distinct claims; at most one election claim
 * naming a party or candidate; at least one true answer; at least one claim where the room majority
 * was wrong; categories not all the same; no claim repeated within `window` days. Existing day files
 * are kept unless --force. The composer searches randomly with a seed and prints what it could not
 * satisfy instead of writing a bad day. HUMAN: day composition and order are a taste call; this
 * script only finds a valid arrangement.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

type Claim = { id: string; answer: 'true' | 'false'; category: string; status: string; text: string; room: { pctTrue: number; pctFalse: number } }
type Day = { date: string; claims: string[] }

const args = process.argv.slice(2)
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(`--${name}`)
  if (i >= 0 && args[i + 1]) return args[i + 1]
  const eq = args.find((a) => a.startsWith(`--${name}=`))
  return eq ? eq.split('=')[1] : dflt
}
const FROM = opt('from', '')
const TO = opt('to', '')
const WINDOW = Number(opt('window', '7'))
const FORCE = args.includes('--force')
const MIN_ELECTION = Number(opt('election', '0'))
const SKIP = new Set(opt('skip', '').split(',').filter(Boolean))
let seed = Number(opt('seed', '12'))
if (!FROM || !TO) {
  console.error('usage: compose-days --from YYYY-MM-DD --to YYYY-MM-DD [--window N] [--seed N] [--force]')
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
  .filter((c) => c.status === 'verified' && !SKIP.has(c.id))

const PARTY = /\b(Democrats?|Democratic|Republicans?|GOP|Trump|Biden|Harris|Obama|Clinton|Bush|Pence|Vance|Walz|DeSantis|Newsom|party|parties)\b/i
const partyElection = (c: Claim) => c.category === 'election' && PARTY.test(c.text)
const majorityWrong = (c: Claim) => (c.answer === 'true' ? c.room.pctTrue : c.room.pctFalse) <= 50

const toDays = (k: string) => Math.floor(Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)) / 86400000)
const fromDays = (d: number) => new Date(d * 86400000).toISOString().slice(0, 10)

const existing = new Map<string, Day>()
for (const f of readdirSync(daysDir).filter((f) => f.endsWith('.json'))) {
  const d = JSON.parse(readFileSync(join(daysDir, f), 'utf8')) as Day
  existing.set(d.date ?? f.replace('.json', ''), d)
}

const lastUsed = new Map<string, number>() // claim id → day number
// seed lastUsed from existing days before FROM (and any kept days)
for (const [date, d] of existing) if (!(FORCE && date >= FROM && date <= TO)) for (const id of d.claims) lastUsed.set(id, Math.max(lastUsed.get(id) ?? -1e9, toDays(date)))

function validDay(set: Claim[]): string | null {
  if (set.length !== 5) return 'needs 5'
  if (set.filter(partyElection).length > 1) return 'two party/candidate election claims'
  if (!set.some((c) => c.answer === 'true')) return 'no true answer'
  if (!set.some(majorityWrong)) return 'no majority-wrong claim'
  if (new Set(set.map((c) => c.category)).size === 1) return 'all one category'
  if (set.filter((c) => c.category === 'election').length < MIN_ELECTION) return `fewer than ${MIN_ELECTION} election claims`
  return null
}

const RESTARTS = Number(opt('restarts', '400'))
const baseLastUsed = new Map(lastUsed)

type Plan = { report: string[]; days: Day[]; failures: number }

function attempt(): Plan {
  const used = new Map(baseLastUsed)
  const report: string[] = []
  const days: Day[] = []
  let failures = 0
  for (let d = toDays(FROM); d <= toDays(TO); d++) {
    const date = fromDays(d)
    if (existing.has(date) && !FORCE) {
      for (const id of existing.get(date)!.claims) used.set(id, d)
      report.push(`${date}: kept existing`)
      continue
    }
    const pool = claims.filter((c) => d - (used.get(c.id) ?? -1e9) >= WINDOW)
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
      for (const c of shuffle(pool.filter((c) => c.category === 'election'))) {
        if (pick.length >= MIN_ELECTION) break
        if (partyElection(c) && pick.some(partyElection)) continue
        add(c)
      }
      if (!pick.some((c) => c.answer === 'true')) add(trues.find((c) => !pick.includes(c)))
      if (!pick.some(majorityWrong)) add(wrongs.find((c) => !pick.includes(c)))
      for (const c of rest) {
        if (pick.length >= 5) break
        if (partyElection(c) && pick.some(partyElection)) continue
        if (c.category === 'election' && pick.filter((x) => x.category === 'election').length >= Math.max(MIN_ELECTION, 1) + 1) continue
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
    for (const c of best) used.set(c.id, d)
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
