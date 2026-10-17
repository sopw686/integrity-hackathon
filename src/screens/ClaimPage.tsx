import { Link, useParams } from 'react-router'
import { Header } from '../components/Header'
import { RoomFrame } from '../components/RoomFrame'
import { dayForClaim, getClaim } from '../lib/content'
import { useDotSize, useTitle, useToday } from '../lib/hooks'
import { getDay as getRecord } from '../lib/storage'
import { COPY } from '../tokens/copy'
import { NotFound } from './NotFound'
import { Evidence, Lesson, RoomContext } from '../components/RevealNotes'
import { Badge } from '../components/Badge'
import { badgeFor } from '../lib/scoring'

/** Read-only reveal for deep links: the full grid already revealed, source and truth source, a button to play today. */
export function ClaimPage() {
  const { id = '' } = useParams()
  const claim = getClaim(id)
  const today = useToday()
  const dot = useDotSize()
  useTitle(claim ? `${claim.text} — Read the Room` : 'Read the Room')
  if (!claim) return <NotFound />

  // If this browser played the claim, show its own guess and dot.
  const day = dayForClaim(claim.id, today)
  const rec = day ? getRecord(day.date) : undefined
  const i = day ? day.claims.indexOf(claim.id) : -1
  const verdict = rec && i >= 0 ? rec.answers[i] : undefined
  const guess = rec && i >= 0 ? rec.guesses[i] : undefined

  return (
    <main className="page claim-page">
      <Header right={COPY.readOnly} />
      <div className="meta">
        <span className="label">{claim.category}</span>
        <span className="label">{claim.room.label}</span>
      </div>
      <section className="read">
        <h1 className="claim-text">{claim.text}</h1>
        <div className="room-center">
          <RoomFrame split={claim.room} label={claim.room.label} mode="reveal" t={Infinity} guess={guess} verdict={verdict} dot={dot} answer={claim.answer} />
        </div>
        <div className="reveal-below">
          <p className={`chip truth-chip ${claim.answer}`}>{COPY.truthIs(claim.answer)}</p>
          <Evidence claim={claim} />
          <Lesson claim={claim} />
          <RoomContext claim={claim} guess={guess} badge={verdict ? <Badge id={badgeFor(claim, verdict)} compact /> : undefined} />
        </div>
      </section>
      <section className="section stack">
        <Link to="/" className="btn">{COPY.playToday}</Link>
      </section>
    </main>
  )
}
