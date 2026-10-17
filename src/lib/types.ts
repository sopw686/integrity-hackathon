export type Verdict = 'true' | 'false'

// national: a named public poll. campus: the team's 5C survey. illustrative: a demo crowd the team
// set by hand for a claim no poll has measured yet; always labeled as such, never presented as data.
export type RoomKind = 'national' | 'campus' | 'illustrative'

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

/** The transferable skill shown on reveal: the trick this claim uses and how to check one like it. */
export type Lesson = {
  pattern: string          // 2–5 words naming the misinformation mechanism: "Old rule, new screenshot"
  tip: string              // one or two sentences, specific to this claim's mechanism
}

export type Claim = {
  id: string               // kebab-case
  text: string             // the claim exactly as the room was asked, in plain declarative form
  shortTitle?: string      // optional 2–4 word title for results rows; falls back to a truncation of text
  seenIn?: string          // optional scenario frame shown above the claim: "a group chat" (where a student might meet it; not a sourcing claim)
  answer: Verdict
  room: Room
  truthSource: TruthSource
  lesson: Lesson
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
  surePoints: number       // confidence points: 0 at 50%, more when right and sure, a loss when wrong and sure
  error: number
  badge: BadgeId
  confidence?: number      // how sure the player said they were (50–100); absent on days played before this step existed
  checked?: boolean        // the player spent the day's fact-check on this claim before calling it
}

/** accuracy: calls right (0–5). read: crowd read (0–100). sure: confidence points (−75…+25).
 *  total: the day's score, 0–100 (sure and total are absent on days played before confidence was scored). */
export type DayScores = { accuracy: number; read: number; sure?: number; total?: number }

export type DayRecord = {
  answers: Verdict[]
  guesses: number[]
  scores: DayScores
  badges: BadgeId[]
  confidence?: number[]    // per claim, how sure the player said they were; absent on older records
  checked?: number[]       // indexes of claims the player fact-checked before calling (at most CHECKS_PER_DAY)
  completedAt?: string     // ISO; present once all five are locked
  archive?: boolean        // played from the archive; excluded from streak and stats
}

export type PersistedState = {
  version: 1
  days: Record<string, DayRecord>
  streak: number
  lastPlayed: string | null // date key of the last completed non-archive day
}
