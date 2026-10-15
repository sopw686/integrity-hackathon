import { Link, useParams } from 'react-router'
import { Header } from '../components/Header'
import { RoomFrame } from '../components/RoomFrame'
import { dayForClaim, getClaim } from '../lib/content'
import { useDotSize, useTitle, useToday } from '../lib/hooks'
import { getDay as getRecord } from '../lib/storage'
import { COPY } from '../tokens/copy'
import { NotFound } from './NotFound'

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
        <div className="source-block">
          <p className="label source-line">
            {COPY.source(claim.room.source, claim.room.fieldDates, claim.room.n)}
            {claim.room.note ? ` — ${claim.room.note}` : ''}
          </p>
          {claim.room.questionWording && <p className="small muted">Asked as: “{claim.room.questionWording}”</p>}
          <p className="small truth-line">
            <a href={claim.truthSource.url} target="_blank" rel="noopener noreferrer">{claim.truthSource.label}</a>: {claim.truthSource.oneLine}
          </p>
        </div>
      </section>
      <section className="section stack">
        <Link to="/" className="btn">{COPY.playToday}</Link>
      </section>
    </main>
  )
}
