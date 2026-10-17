import type { ReactNode } from 'react'
import type { Claim } from '../lib/types'
import { COPY } from '../tokens/copy'

// HUMAN: how far a crowd guess must miss before the reveal says so.
const MISREAD_NOTE = 10

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** Evidence first: why the claim is true or false, and the authority that settles it. */
export function Evidence({ claim }: { claim: Claim }) {
  const host = hostOf(claim.truthSource.url)
  return (
    <div className="evidence">
      <p className="label evidence-head">{COPY.evidenceHead(claim.answer)}</p>
      <p className="evidence-line serif">{claim.truthSource.oneLine}</p>
      <a className="evidence-source" href={claim.truthSource.url} target="_blank" rel="noopener noreferrer">
        <span className="evidence-org">{claim.truthSource.label}</span>
        <span className="evidence-host small muted">
          {COPY.readSource}
          {host ? ` · ${host}` : ''} <span aria-hidden="true">↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </span>
      </a>
    </div>
  )
}

/** The transferable skill: the trick this claim uses, and how to check the next one. */
export function Lesson({ claim }: { claim: Claim }) {
  if (!claim.lesson) return null
  return (
    <div className="lesson">
      <p className="label lesson-head">
        {COPY.lessonHead} <span className="lesson-pattern">{claim.lesson.pattern}</span>
      </p>
      <p className="lesson-tip">{claim.lesson.tip}</p>
    </div>
  )
}

/** Lines that put the room in its place: popularity is context, never evidence. */
export function crowdLines(claim: Claim, guess?: number): string[] {
  const out: string[] = []
  const { pctTrue, pctFalse, kind } = claim.room
  if (kind === 'illustrative') return out
  if (claim.answer === 'false' && pctTrue > pctFalse) out.push(COPY.crowdBelievedFalse(pctTrue))
  if (claim.answer === 'true' && pctFalse > pctTrue) out.push(COPY.crowdDoubtedTrue(pctFalse))
  if (guess !== undefined && Math.abs(guess - pctTrue) > MISREAD_NOTE) {
    const over = guess > pctTrue
    const why = claim.answer === 'false' ? (over ? COPY.misreadWhy.falseOver : COPY.misreadWhy.falseUnder) : over ? COPY.misreadWhy.trueOver : COPY.misreadWhy.trueUnder
    out.push(`${COPY.misread(Math.round(guess), pctTrue)} ${why}`)
  }
  return out
}

/** The room as context: who was asked, when, and how; a demo crowd says plainly that it is one. */
export function RoomContext({ claim, guess, badge }: { claim: Claim; guess?: number; badge?: ReactNode }) {
  const { room } = claim
  const lines = crowdLines(claim, guess)
  const demo = room.kind === 'illustrative'
  return (
    <div className="room-context">
      <p className="label room-context-head">{COPY.roomHead}</p>
      {badge}
      {lines.map((l) => (
        <p className="small room-context-line" key={l}>{l}</p>
      ))}
      {demo ? (
        <p className="small muted room-source">
          <span className="demo-tag label">{COPY.demoCrowdShort}</span> {COPY.demoCrowd}
          {room.note ? ` ${room.note}` : ''}
        </p>
      ) : (
        <details className="room-source small muted">
          <summary>
            {room.label} · {room.source}, {room.fieldDates}, n={room.n.toLocaleString('en-US')}
          </summary>
          {room.questionWording && <p>{COPY.askedAs(room.questionWording)}</p>}
          {room.note && <p>{room.note}</p>}
          <p>
            <a href={room.sourceUrl} target="_blank" rel="noopener noreferrer">
              {COPY.pollLink}: {room.source} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </details>
      )}
    </div>
  )
}
