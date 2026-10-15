// Build-time content validator for content/claims/*.json and content/days/*.json.
//
//   tsx scripts/validate-content.ts [--from YYYY-MM-DD] [--online] [--days N]
//
// Importable: validateContent(claims, days, opts) -> { errors, warnings }.
// Every message is prefixed with the file it belongs to ("<file>: <message>").
// Node built-ins only. The date logic mirrors src/lib/day.ts but is reimplemented here
// because scripts compile under tsconfig.node.json.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type ContentFile = { file: string; data: unknown }
export type ValidateOptions = {
  /** First date that must have a day file. Default: today in America/Los_Angeles. */
  from?: string
  /** How many consecutive days from `from` must exist. Default 14. */
  days?: number
  /** Year used for the "old source" warning. Default: the year of `from`. */
  currentYear?: number
}
export type ValidationResult = { errors: string[]; warnings: string[] }

// ---------------------------------------------------------------- constants

const TIME_ZONE = 'America/Los_Angeles'
const DEFAULT_COVERAGE_DAYS = 14
// HUMAN: the no-repeat window, temporary. Target is 7 (error) / 14 (warning) once the verified pool passes
// ~40 claims with at least 7 majority-wrong ones. Today's pool (34 verified, 6 majority-wrong) allows at most 6:
// compose-days fills 2026-10-04..10-29 at --window 6, while 7 needs 35 claims and 7 majority-wrong ones in any
// 7 straight days. The shipped days were composed at 5, and days whose date has arrived must not change.
export const NO_REPEAT_ERROR_DAYS = 5 // same claim on two days less than 5 days apart: error
export const NO_REPEAT_WARN_DAYS = 7 // less than 7 days apart: warning

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const CATEGORIES = ['election', 'campus', 'health', 'science', 'society', 'media'] as const
const ROOM_KINDS = ['national', 'campus'] as const
const VERDICTS = ['true', 'false'] as const
const STATUSES = ['verified', 'draft'] as const
const DIFFICULTIES = [1, 2, 3] as const
const MAX_TEXT_LENGTH = 220

/** A fixed keyword list, so it misses anyone not on it; whoever composes a day still checks by hand. */
export const PARTY_RE =
  /\b(Democrats?|Democratic|Republicans?|GOP|MAGA|Trump|Biden|Harris|Kamala|Obama|Clinton|Hillary|Bush|Pence|Vance|Walz|DeSantis|Newsom|Romney|McCain|Sanders|Reagan|Carter|Kennedy|candidates?|party|parties|partisan)\b/i
/** Reviewer notes that must be gone before a claim is verified. Case-sensitive, so prose like "verify" passes. */
const REVIEWER_MARKER_RE = /\b(?:HUMAN:|VERIFY|TODO|TBD)(?=\W|$)/
/** Words the UI never uses. Pollster titles in room.source are cited verbatim and not checked. */
const BANNED_WORDS_RE = /misinformation|media literacy|\bbias\b/i

/** Two-word capitalised phrases that are fine to name. Matched case-sensitively. */
const NAME_ALLOWLIST = [
  'Barack Obama',
  'United States',
  'Election Day',
  'Harvey Mudd',
  'Los Angeles',
  'Claremont',
  'Pomona',
  'Harvard',
  'Sandy Hook',
  'COVID-19',
  'New York',
  'Supreme Court',
  'LA County',
  'California',
]

type FieldType = 'string' | 'number' | 'object'
type FieldSpec = { type: FieldType; optional?: boolean }

const CLAIM_FIELDS: Record<string, FieldSpec> = {
  id: { type: 'string' },
  text: { type: 'string' },
  shortTitle: { type: 'string', optional: true },
  answer: { type: 'string' },
  room: { type: 'object' },
  truthSource: { type: 'object' },
  category: { type: 'string' },
  difficulty: { type: 'number' },
  status: { type: 'string' },
}
const ROOM_FIELDS: Record<string, FieldSpec> = {
  kind: { type: 'string' },
  label: { type: 'string' },
  pctTrue: { type: 'number' },
  pctFalse: { type: 'number' },
  pctUnsure: { type: 'number' },
  source: { type: 'string' },
  sourceUrl: { type: 'string' },
  fieldDates: { type: 'string' },
  n: { type: 'number' },
  questionWording: { type: 'string', optional: true },
  note: { type: 'string', optional: true },
}
const TRUTH_FIELDS: Record<string, FieldSpec> = {
  label: { type: 'string' },
  url: { type: 'string' },
  oneLine: { type: 'string' },
}
const DAY_FIELDS: Record<string, FieldSpec> = {
  date: { type: 'string' },
  claims: { type: 'object' },
  roomOverlay: { type: 'object', optional: true },
}

// ---------------------------------------------------------------- dates

/** YYYY-MM-DD for the given instant in America/Los_Angeles (same approach as src/lib/day.ts). */
export function dateKeyLA(d: Date = new Date()): string {
  try {
    const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
    const parts = dtf.formatToParts(d)
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

function toUTCDays(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function addDays(key: string, n: number): string {
  return new Date((toUTCDays(key) + n) * 86_400_000).toISOString().slice(0, 10)
}

export function isValidDateKey(key: string): boolean {
  return DATE_RE.test(key) && addDays(key, 0) === key
}

function daysBetween(a: string, b: string): number {
  return toUTCDays(b) - toUTCDays(a)
}

// ---------------------------------------------------------------- helpers

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)
const baseName = (file: string): string => path.basename(file).replace(/\.json$/i, '')
const isTemplate = (file: string): boolean => path.basename(file).startsWith('_')

function isHttpsUrl(s: unknown): boolean {
  if (typeof s !== 'string' || s.trim() !== s || s === '') return false
  try {
    const u = new URL(s)
    return u.protocol === 'https:' && u.hostname.length > 0
  } catch {
    return false
  }
}

function typeOf(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  return typeof v
}

/**
 * Check keys and primitive types of an object against a spec.
 * Missing required keys go to `missing` (caller decides error vs warning); wrong types and
 * unknown keys always go to `err`.
 */
function checkShape(
  obj: Obj,
  spec: Record<string, FieldSpec>,
  where: string,
  err: (m: string) => void,
  missing: (m: string) => void,
): void {
  for (const [key, f] of Object.entries(spec)) {
    if (!(key in obj)) {
      if (!f.optional) missing(`${where}${key} is missing`)
      continue
    }
    const v = obj[key]
    const ok =
      f.type === 'object' ? typeof v === 'object' && v !== null : f.type === 'number' ? typeof v === 'number' && Number.isFinite(v) : typeof v === f.type
    if (!ok) err(`${where}${key} should be a ${f.type}, got ${typeOf(v)}`)
  }
  for (const key of Object.keys(obj)) {
    if (!(key in spec)) err(`${where}${key} is not a known field`)
  }
}

/** Words that look like a proper name pair (two consecutive Capitalised words) outside the allowlist. */
export function suspiciousNames(text: string): string[] {
  let masked = text.normalize('NFC')
  for (const phrase of NAME_ALLOWLIST) masked = masked.split(phrase).join('x')
  const out: string[] = []
  // Two words of ≥2 letters each, so abbreviations like "U.S." don't trip it. Unicode letters, so
  // "José Martínez" counts; an apostrophe after the capital ("O’Brien") is allowed.
  const word = String.raw`\p{Lu}(?:['’]\p{Lu})?\p{Ll}[\p{L}\p{M}\p{N}'’-]*`
  const re = new RegExp(String.raw`(?<![\p{L}\p{M}\p{N}'’])(${word})\s+(?=(${word}))`, 'gu')
  let m: RegExpExecArray | null
  while ((m = re.exec(masked)) !== null) out.push(`${m[1]} ${m[2]}`)
  return out
}

// ---------------------------------------------------------------- claims

type ClaimInfo = {
  file: string
  id: string
  status: string
  answer: string
  category: string
  text: string
  pctTrue: number
  pctFalse: number
  sourceUrl: string
  truthUrl: string
}

function validateClaim(
  file: string,
  data: unknown,
  currentYear: number,
  err: (m: string) => void,
  warn: (m: string) => void,
): ClaimInfo | null {
  if (!isObj(data)) {
    err('claim file is not a JSON object')
    return null
  }
  const status = str(data.status)
  const isDraft = status === 'draft'

  // id and status are required for every claim, draft or not.
  if (!('status' in data)) err('status is missing')
  else if (!(STATUSES as readonly string[]).includes(status)) err(`status must be "verified" or "draft", got ${JSON.stringify(data.status)}`)
  const id = str(data.id)
  if (!('id' in data) || id === '') err('id is missing or empty')
  else {
    if (!ID_RE.test(id)) err(`id "${id}" is not kebab-case (a-z, 0-9, single hyphens)`)
    if (id !== baseName(file)) err(`id "${id}" does not match the file name "${baseName(file)}"`)
  }

  // Drafts: missing keys and enum mismatches are warnings; wrong types and unknown keys are errors.
  const missing = isDraft ? warn : err
  const soft = isDraft ? warn : err

  checkShape(data, CLAIM_FIELDS, '', err, (m) => (m.startsWith('id ') || m.startsWith('status ') ? undefined : missing(m)))
  const room = isObj(data.room) ? data.room : null
  const truth = isObj(data.truthSource) ? data.truthSource : null
  if ('room' in data && !room) err('room should be an object')
  if ('truthSource' in data && !truth) err('truthSource should be an object')
  if (room) checkShape(room, ROOM_FIELDS, 'room.', err, missing)
  if (truth) checkShape(truth, TRUTH_FIELDS, 'truthSource.', err, missing)

  if ('answer' in data && !(VERDICTS as readonly unknown[]).includes(data.answer))
    soft(`answer must be "true" or "false" (strings), got ${JSON.stringify(data.answer)}`)
  if ('category' in data && !(CATEGORIES as readonly unknown[]).includes(data.category))
    soft(`category must be one of ${CATEGORIES.join(', ')}, got ${JSON.stringify(data.category)}`)
  if ('difficulty' in data && !(DIFFICULTIES as readonly unknown[]).includes(data.difficulty))
    soft(`difficulty must be 1, 2 or 3, got ${JSON.stringify(data.difficulty)}`)
  if (room && 'kind' in room && !(ROOM_KINDS as readonly unknown[]).includes(room.kind))
    soft(`room.kind must be "national" or "campus", got ${JSON.stringify(room.kind)}`)
  if ('shortTitle' in data && typeof data.shortTitle === 'string' && data.shortTitle.trim() === '' && !isDraft)
    err('shortTitle is present but empty (remove it or fill it)')
  if (!isDraft && typeof data.shortTitle === 'string' && data.shortTitle.trim() !== '') {
    const words = data.shortTitle.trim().split(/\s+/).length
    if (words < 2 || words > 4) warn(`shortTitle "${data.shortTitle}" is ${words} word(s); keep it to 2–4`)
  }

  const text = str(data.text)
  const pctTrue = num(room?.pctTrue)
  const pctFalse = num(room?.pctFalse)
  const pctUnsure = num(room?.pctUnsure)

  if (status === 'verified') {
    if (text.trim() === '') err('text is empty')
    else {
      if (!text.trim().endsWith('.')) err('text must end with a period')
      if (text.length > MAX_TEXT_LENGTH) err(`text is ${text.length} characters (max ${MAX_TEXT_LENGTH})`)
    }
    if (room) {
      for (const [k, v] of [['pctTrue', pctTrue], ['pctFalse', pctFalse], ['pctUnsure', pctUnsure]] as const) {
        if (Number.isFinite(v) && (v < 0 || v > 100)) err(`room.${k} is ${v}; must be between 0 and 100`)
      }
      if ([pctTrue, pctFalse, pctUnsure].every(Number.isFinite)) {
        const sum = pctTrue + pctFalse + pctUnsure
        if (Math.abs(sum - 100) > 1) err(`room.pctTrue + pctFalse + pctUnsure = ${sum}; must be 100 ± 1`)
      }
      const n = num(room.n)
      if (Number.isFinite(n) && n <= 0) err(`room.n is ${n}; must be greater than 0`)
      if (typeof room.fieldDates === 'string' && room.fieldDates.trim() === '') err('room.fieldDates is empty')
      if (typeof room.label === 'string' && room.label.trim() === '') err('room.label is empty')
      if (typeof room.source === 'string' && room.source.trim() === '') err('room.source is empty')
      if ('sourceUrl' in room && !isHttpsUrl(room.sourceUrl)) err(`room.sourceUrl is not a valid https:// URL: ${JSON.stringify(room.sourceUrl)}`)

      // Warning: old source without a caveat note.
      const years = (str(room.fieldDates).match(/\b(1[89]|20)\d{2}\b/g) ?? []).map(Number)
      if (years.length > 0) {
        const latest = Math.max(...years)
        if (latest < currentYear - 5 && (typeof room.note !== 'string' || room.note.trim() === ''))
          warn(`room.note missing: field dates are from ${latest}, more than 5 years ago; add a caveat such as "${latest} survey; older data"`)
      }
    }
    if (truth) {
      if ('url' in truth && !isHttpsUrl(truth.url)) err(`truthSource.url is not a valid https:// URL: ${JSON.stringify(truth.url)}`)
      if (typeof truth.oneLine === 'string' && truth.oneLine.trim() === '') err('truthSource.oneLine is empty')
      if (typeof truth.label === 'string' && truth.label.trim() === '') err('truthSource.label is empty')
    }

    // Player-facing strings: no reviewer notes left behind, and none of the words the UI never uses.
    const shown: Array<[string, unknown]> = [
      ['text', data.text],
      ['shortTitle', data.shortTitle],
      ['room.label', room?.label],
      ['room.note', room?.note],
      ['room.questionWording', room?.questionWording],
      ['truthSource.label', truth?.label],
      ['truthSource.oneLine', truth?.oneLine],
    ]
    for (const [k, v] of shown) {
      if (typeof v !== 'string') continue
      if (REVIEWER_MARKER_RE.test(v)) err(`${k} still contains a reviewer marker (HUMAN:/VERIFY/TODO/TBD); remove it before setting status to "verified"`)
      if (k !== 'room.label' && BANNED_WORDS_RE.test(v))
        warn(`${k} says "${v.match(BANNED_WORDS_RE)![0]}"; the UI avoids "misinformation", "media literacy" and "bias" (pollster titles in room.source are exempt)`)
    }
  }

  // Warning: possible private individual named (all claims, so drafts get flagged early).
  const names = suspiciousNames(text)
  if (names.length > 0)
    warn(`text has capitalised word pairs (${names.map((s) => `"${s}"`).join(', ')}); a human must confirm no private individual is named`)

  if (id === '') return null
  return {
    file,
    id,
    status,
    answer: str(data.answer),
    category: str(data.category),
    text,
    pctTrue,
    pctFalse,
    sourceUrl: str(room?.sourceUrl),
    truthUrl: str(truth?.url),
  }
}

// ---------------------------------------------------------------- days

type DayInfo = { file: string; date: string; claims: string[] }

function validateDay(
  file: string,
  data: unknown,
  claimsById: Map<string, ClaimInfo>,
  err: (m: string) => void,
): DayInfo | null {
  if (!isObj(data)) {
    err('day file is not a JSON object')
    return null
  }
  checkShape(data, DAY_FIELDS, '', err, err)

  const date = str(data.date)
  let dateOk = false
  if ('date' in data && typeof data.date === 'string') {
    if (!DATE_RE.test(date)) err(`date "${date}" is not YYYY-MM-DD`)
    else if (!isValidDateKey(date)) err(`date "${date}" is not a real calendar date`)
    else dateOk = true
    if (date !== baseName(file)) {
      err(`date "${date}" does not match the file name "${baseName(file)}"`)
      dateOk = false
    }
  }

  if ('roomOverlay' in data) {
    const ro = data.roomOverlay
    if (!isObj(ro)) err('roomOverlay should be an object { pctTrue, n }')
    else checkShape(ro, { pctTrue: { type: 'number' }, n: { type: 'number' } }, 'roomOverlay.', err, err)
  }

  if (!Array.isArray(data.claims)) {
    if ('claims' in data) err('claims should be an array of five claim ids')
    return null
  }
  const ids = data.claims
  if (ids.length !== 5) err(`claims has ${ids.length} ids; must be exactly 5`)
  const strIds: string[] = []
  ids.forEach((v, i) => {
    if (typeof v !== 'string') err(`claims[${i}] should be a string, got ${typeOf(v)}`)
    else strIds.push(v)
  })
  const seen = new Set<string>()
  for (const id of strIds) {
    if (seen.has(id)) err(`claim "${id}" appears twice on the same day`)
    seen.add(id)
  }

  const resolved: ClaimInfo[] = []
  for (const id of strIds) {
    const c = claimsById.get(id)
    if (!c) err(`claim "${id}" does not exist in content/claims`)
    else {
      if (c.status !== 'verified') err(`claim "${id}" is a ${c.status || 'non-verified'} claim; only verified claims may be scheduled`)
      resolved.push(c)
    }
  }

  // Composition rules run only when all five ids resolve, so a typo does not cascade.
  if (strIds.length === 5 && resolved.length === 5) {
    const party = resolved.filter((c) => c.category === 'election' && PARTY_RE.test(c.text))
    if (party.length > 1)
      err(`more than one election claim mentions a party or candidate (${party.map((c) => c.id).join(', ')}); max one per day`)
    if (!resolved.some((c) => c.answer === 'true')) err('no claim with answer "true"; each day needs at least one')
    const majorityWrong = resolved.filter((c) => {
      const share = c.answer === 'true' ? c.pctTrue : c.pctFalse
      return Number.isFinite(share) && share <= 50
    })
    if (majorityWrong.length === 0) err('no claim where the room majority was wrong (truth-side share ≤ 50); each day needs at least one')
    if (new Set(resolved.map((c) => c.category)).size === 1) err(`all five claims share the category "${resolved[0].category}"`)
  }

  return dateOk ? { file, date, claims: strIds } : null
}

// ---------------------------------------------------------------- main API

export function validateContent(claims: ContentFile[], days: ContentFile[], opts: ValidateOptions = {}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const from = opts.from ?? dateKeyLA()
  const coverage = opts.days ?? DEFAULT_COVERAGE_DAYS
  const currentYear = opts.currentYear ?? Number(from.slice(0, 4))

  const errFor = (file: string) => (m: string) => void errors.push(`${file}: ${m}`)
  const warnFor = (file: string) => (m: string) => void warnings.push(`${file}: ${m}`)

  // Claims
  const claimsById = new Map<string, ClaimInfo>()
  let verifiedWithoutWording = 0
  for (const { file, data } of claims) {
    if (isTemplate(file)) {
      // Templates are skipped here and left out of the app bundle, so a filled-in one would vanish.
      if (isObj(data) && data.status === 'verified')
        errFor(file)('a template file (name starts with "_") is never validated or shipped; copy it to <id>.json and verify that copy')
      continue
    }
    const info = validateClaim(file, data, currentYear, errFor(file), warnFor(file))
    if (!info) continue
    if (claimsById.has(info.id)) errFor(file)(`duplicate id "${info.id}" (also in ${claimsById.get(info.id)!.file})`)
    else claimsById.set(info.id, info)
    if (info.status === 'verified' && isObj(data) && isObj(data.room) && !('questionWording' in data.room)) verifiedWithoutWording++
  }
  if (verifiedWithoutWording > 0)
    warnings.push(
      `content/claims: ${verifiedWithoutWording} verified claim(s) have no questionWording. Polarity cannot be checked automatically: a human must reread every claim against the poll's exact wording.`,
    )

  // Days
  const validDays: DayInfo[] = []
  const dayFiles = new Set<string>()
  for (const { file, data } of days) {
    if (isTemplate(file)) {
      errFor(file)('day files starting with "_" are never validated or shipped; name it YYYY-MM-DD.json or move it out of content/days')
      continue
    }
    dayFiles.add(baseName(file))
    const info = validateDay(file, data, claimsById, errFor(file))
    if (info) validDays.push(info)
  }

  // No repeats: < NO_REPEAT_ERROR_DAYS apart is an error, < NO_REPEAT_WARN_DAYS a warning (reported on the later day).
  validDays.sort((a, b) => a.date.localeCompare(b.date))
  const lastSeen = new Map<string, string>()
  for (const day of validDays) {
    for (const id of new Set(day.claims)) {
      const prev = lastSeen.get(id)
      if (prev) {
        const gap = daysBetween(prev, day.date)
        if (gap < NO_REPEAT_ERROR_DAYS) errFor(day.file)(`claim "${id}" repeats within ${NO_REPEAT_ERROR_DAYS} days (also on ${prev}, ${gap} day(s) earlier)`)
        else if (gap < NO_REPEAT_WARN_DAYS) warnFor(day.file)(`claim "${id}" repeats within ${NO_REPEAT_WARN_DAYS} days (also on ${prev}, ${gap} days earlier)`)
      }
      lastSeen.set(id, day.date)
    }
  }

  // Coverage
  if (!isValidDateKey(from)) errors.push(`options: --from "${from}" is not a valid YYYY-MM-DD date`)
  else
    for (let i = 0; i < coverage; i++) {
      const date = addDays(from, i)
      if (!dayFiles.has(date)) errors.push(`content/days/${date}.json: missing (coverage requires ${coverage} days from ${from})`)
    }

  return { errors, warnings }
}

// ---------------------------------------------------------------- online link check

async function urlOk(url: string): Promise<string | null> {
  const attempt = async (method: 'HEAD' | 'GET') => {
    const res = await fetch(url, { method, redirect: 'follow', signal: AbortSignal.timeout(10_000) })
    if (method === 'GET') await res.body?.cancel().catch(() => {})
    return res.status
  }
  let headProblem = ''
  try {
    const s = await attempt('HEAD')
    if (s >= 200 && s < 400) return null
    headProblem = `HEAD ${s}`
  } catch (e) {
    headProblem = `HEAD failed (${(e as Error).message})`
  }
  try {
    const s = await attempt('GET')
    if (s >= 200 && s < 400) return null
    return `${headProblem}; GET ${s}`
  } catch (e) {
    return `${headProblem}; GET failed (${(e as Error).message})`
  }
}

/** Fetch every URL on verified claims. Returns errors in the same "<file>: <message>" form. */
export async function checkLinksOnline(claims: ContentFile[]): Promise<string[]> {
  const targets: Array<{ file: string; field: string; url: string }> = []
  for (const { file, data } of claims) {
    if (isTemplate(file) || !isObj(data) || data.status !== 'verified') continue
    const room = isObj(data.room) ? data.room : {}
    const truth = isObj(data.truthSource) ? data.truthSource : {}
    if (isHttpsUrl(room.sourceUrl)) targets.push({ file, field: 'room.sourceUrl', url: str(room.sourceUrl) })
    if (isHttpsUrl(truth.url)) targets.push({ file, field: 'truthSource.url', url: str(truth.url) })
  }
  const cache = new Map<string, Promise<string | null>>()
  const results = await Promise.all(
    targets.map(async (t) => {
      if (!cache.has(t.url)) cache.set(t.url, urlOk(t.url))
      const problem = await cache.get(t.url)!
      return problem ? `${t.file}: ${t.field} ${t.url} is unreachable: ${problem}` : null
    }),
  )
  return results.filter((r): r is string => r !== null)
}

// ---------------------------------------------------------------- CLI

function readDir(dir: string, rel: string, errors: string[]): ContentFile[] {
  if (!fs.existsSync(dir)) return []
  const out: ContentFile[] = []
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const file = `${rel}/${name}`
    try {
      out.push({ file, data: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) })
    } catch (e) {
      errors.push(`${file}: not valid JSON (${(e as Error).message})`)
    }
  }
  return out
}

function parseArgs(argv: string[]): { from?: string; days?: number; online: boolean; problems: string[] } {
  const out: { from?: string; days?: number; online: boolean; problems: string[] } = { online: false, problems: [] }
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=', 2)
    const value = () => inline ?? argv[++i]
    if (flag === '--online') out.online = true
    else if (flag === '--from') {
      const v = value()
      if (!v || !isValidDateKey(v)) out.problems.push(`--from needs a real YYYY-MM-DD date, got ${JSON.stringify(v)}`)
      else out.from = v
    } else if (flag === '--days') {
      const v = Number(value())
      if (!Number.isInteger(v) || v < 0) out.problems.push(`--days needs a non-negative integer`)
      else out.days = v
    } else out.problems.push(`unknown argument ${JSON.stringify(argv[i])}`)
  }
  return out
}

function printGrouped(errors: string[], warnings: string[]): void {
  const groups = new Map<string, string[]>()
  const add = (line: string, mark: string) => {
    const i = line.indexOf(': ')
    const file = i === -1 ? '(general)' : line.slice(0, i)
    const msg = i === -1 ? line : line.slice(i + 2)
    if (!groups.has(file)) groups.set(file, [])
    groups.get(file)!.push(`  ${mark} ${msg}`)
  }
  errors.forEach((e) => add(e, '✗'))
  warnings.forEach((w) => add(w, '△'))
  for (const file of [...groups.keys()].sort()) {
    console.log(file)
    for (const line of groups.get(file)!) console.log(line)
    console.log('')
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  if (args.problems.length > 0) {
    for (const p of args.problems) console.error(`✗ ${p}`)
    console.error('usage: tsx scripts/validate-content.ts [--from YYYY-MM-DD] [--online] [--days N]')
    process.exit(1)
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const parseErrors: string[] = []
  const claims = readDir(path.join(root, 'content/claims'), 'content/claims', parseErrors)
  const days = readDir(path.join(root, 'content/days'), 'content/days', parseErrors)
  const from = args.from ?? dateKeyLA()

  const { errors, warnings } = validateContent(claims, days, { from, days: args.days })
  errors.unshift(...parseErrors)
  if (args.online) errors.push(...(await checkLinksOnline(claims)))

  printGrouped(errors, warnings)

  const real = claims.filter((c) => !isTemplate(c.file) && isObj(c.data))
  const verified = real.filter((c) => (c.data as Obj).status === 'verified').length
  const draft = real.filter((c) => (c.data as Obj).status === 'draft').length
  const badDayFiles = new Set(errors.map((e) => e.slice(0, e.indexOf(': '))).filter((f) => f.startsWith('content/days/')))
  const daysOk = days.filter((d) => !isTemplate(d.file) && !badDayFiles.has(d.file)).length

  const span = args.days ?? DEFAULT_COVERAGE_DAYS
  if (span > 0) console.log(`Coverage window: ${from} to ${addDays(from, span - 1)} (${span} days, America/Los_Angeles).`)
  if (!args.online) console.log('Links were not checked (offline). Run with --online to fetch every source and truth URL.')
  console.log(`${errors.length} error(s), ${warnings.length} warning(s).`)
  console.log(`${verified} verified claims, ${draft} draft, ${daysOk} days OK`)
  process.exit(errors.length > 0 ? 1 : 0)
}

/** True when this file is the entry point. Compares real paths (a symlinked path still counts) and accepts the extensionless form tsx allows. */
function invokedDirectly(): boolean {
  if (process.argv[1] === undefined) return false
  const self = fs.realpathSync(fileURLToPath(import.meta.url))
  const entry = path.resolve(process.argv[1])
  for (const candidate of [entry, `${entry}.ts`]) {
    try {
      if (fs.realpathSync(candidate) === self) return true
    } catch {
      /* no such file; try the next form */
    }
  }
  return false
}

if (invokedDirectly()) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
