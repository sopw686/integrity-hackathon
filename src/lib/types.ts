export type Verdict = 'true' | 'false'

export type RoomKind = 'national' | 'campus'

export type Category = 'election' | 'campus' | 'health' | 'science' | 'society' | 'media'

export type Room = {
  kind: RoomKind
  label: string            // "U.S. adults" | "5C students"
  pctTrue: number          // share of the room that said the claim is true (definitely/probably)
  pctFalse: number         // share that said false
  pctUnsure: number        // share unsure / not asked; pctTrue + pctFalse + pctUnsure = 100
  source: string           // "YouGov"
  sourceUrl: string
  fieldDates: string       // "Nov 9–13, 2023"
  n: number
  questionWording?: string // the poll's own wording if it differs from `text`
  note?: string            // caveats shown on reveal, e.g. "2012 survey; older data"
}

export type TruthSource = { label: string; url: string; oneLine: string }

export type Claim = {
  id: string               // kebab-case
  text: string             // the claim exactly as the room was asked, in plain declarative form
  shortTitle?: string      // optional 2–4 word title for results rows; falls back to a truncation of text
  answer: Verdict
  room: Room
  truthSource: TruthSource
  category: Category
  difficulty: 1 | 2 | 3
  status: 'verified' | 'draft' // the game only loads "verified"
}

export type Day = {
  date: string             // YYYY-MM-DD in America/Los_Angeles
  claims: string[]         // exactly five claim ids, in play order
  roomOverlay?: { pctTrue: number; n: number } // Phase 2 hook: "players so far today", rendered only when present and n ≥ 30
}

export type BadgeId = 'good-company' | 'fox' | 'sheep' | 'stray' | 'split'

export type ClaimResult = {
  claimId: string
  verdict: Verdict
  guess: number
  correct: boolean
  readPoints: number
  error: number
  badge: BadgeId
  confidence?: number      // how sure the player said they were (50–100); absent on days played before this step existed
}

export type DayRecord = {
  answers: Verdict[]
  guesses: number[]
  scores: { accuracy: number; read: number }
  badges: BadgeId[]
  confidence?: number[]    // per claim, how sure the player said they were; absent on older records
  completedAt?: string     // ISO; present once all five are locked
  archive?: boolean        // played from the archive; excluded from streak and stats
}

export type PersistedState = {
  version: 1
  days: Record<string, DayRecord>
  streak: number
  lastPlayed: string | null // date key of the last completed non-archive day
}
