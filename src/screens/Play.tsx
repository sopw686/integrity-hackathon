import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { m } from 'motion/react'
import { Header } from '../components/Header'
import { RoomFrame } from '../components/RoomFrame'
import { RangeSlider } from '../components/RangeSlider'
import { Badge } from '../components/Badge'
import { useGame } from '../lib/game'
import { isValidDateKey, puzzleNumber } from '../lib/day'
import { useDotSize, useReduced, useRevealClock, useTitle, useToday } from '../lib/hooks'
import { COPY } from '../tokens/copy'
import { REDUCED_CROSSFADE, SOURCE_FADE, T_BADGE, T_SOURCE } from '../tokens/motion'

export function Play() {
  const today = useToday()
  const [params] = useSearchParams()
  const dayParam = params.get('day')
  const date = dayParam && isValidDateKey(dayParam) ? dayParam : today
  const archive = date !== today
  const game = useGame(date, archive)
  const reduced = useReduced()
  const dot = useDotSize()
  const navigate = useNavigate()
  const clock = useRevealClock(game.phase === 'reveal', reduced)
  const [moved, setMoved] = useState(false)
  const claimRef = useRef<HTMLHeadingElement>(null)
  const sliderWrap = useRef<HTMLDivElement>(null)

  const { claim, index, claims, phase, verdict, guess, current } = game
  const total = claims.length
  useTitle(claim ? `${index + 1} of ${total} — Read the Room` : 'Read the Room')

  useEffect(() => {
    if (phase === 'done') navigate(archive ? `/results?day=${date}` : '/results', { replace: true })
  }, [phase, navigate, archive, date])

  // Keyboard flow: read the claim on arrival, move to the slider once the verdict is locked.
  useEffect(() => {
    if (phase === 'verdict') {
      setMoved(false)
      claimRef.current?.focus()
    }
    if (phase === 'read') sliderWrap.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [phase, index])

  if (!game.day || !claim) {
    return (
      <main className="page">
        <Header right={archive ? COPY.archiveNote : `No. ${puzzleNumber(date)}`} />
        <section className="section stack">
          <p className="claim-text">No puzzle is set for this day.</p>
          <button type="button" className="btn secondary" onClick={() => navigate('/')}>{COPY.back}</button>
        </section>
      </main>
    )
  }

  const t = clock.t
  const showBadge = phase === 'reveal' && current && (clock.done || t >= (reduced ? REDUCED_CROSSFADE : T_BADGE))
  const showSource = phase === 'reveal' && (clock.done || t >= (reduced ? REDUCED_CROSSFADE : T_SOURCE))
  const overlay = game.day.roomOverlay && game.day.roomOverlay.n >= 30 ? game.day.roomOverlay.pctTrue : undefined

  return (
    <main className="page play">
      <Header right={archive ? COPY.archiveNote : `No. ${puzzleNumber(date)}`} />
      <div className="meta">
        <span className="label">{claim.category}</span>
        <span className="label num">{COPY.claimOf(index + 1, total)}</span>
      </div>

      {phase === 'verdict' && (
        <section className="verdict" key={claim.id}>
          <h1 className="claim-text" ref={claimRef} tabIndex={-1}>
            {claim.text}
          </h1>
          <div className="row verdict-row">
            <button type="button" className="btn secondary" onClick={() => game.setVerdict('true')}>
              {COPY.true}
            </button>
            <button type="button" className="btn secondary" onClick={() => game.setVerdict('false')}>
              {COPY.false}
            </button>
          </div>
        </section>
      )}

      {(phase === 'read' || phase === 'reveal') && verdict && (
        <section className="read" key={`${claim.id}-read`}>
          <h1 className="claim-pinned">{claim.text}</h1>
          <div className="locked-row">
            <span className="chip">{COPY.youSaid(verdict)}</span>
            {phase === 'read' && <span className="label question">{COPY.sliderQuestion}</span>}
          </div>

          <div className="room-center">
            <RoomFrame
              split={claim.room}
              label={claim.room.label}
              mode={phase === 'read' ? 'slider' : 'reveal'}
              guess={guess}
              verdict={phase === 'reveal' ? verdict : undefined}
              t={t}
              reduced={reduced}
              dot={dot}
              answer={phase === 'reveal' ? claim.answer : undefined}
              onTap={archive && phase === 'reveal' && !clock.done ? clock.skip : undefined}
              tapHint="Skip the animation"
              overlay={overlay}
            />
          </div>

          {phase === 'read' && (
            <div className="stack read-controls" ref={sliderWrap}>
              <RangeSlider
                value={guess}
                onChange={(v) => {
                  setMoved(true)
                  game.setGuess(v)
                }}
                label={COPY.sliderQuestion}
              />
              <button type="button" className={`btn${moved ? ' armed' : ''}`} onClick={game.lock}>
                {COPY.lock}
              </button>
            </div>
          )}

          {phase === 'reveal' && current && (
            <div className="reveal-below">
              <div className="badge-slot" aria-live="polite">
                {showBadge && <Badge id={current.badge} animate={!reduced && !clock.done} />}
              </div>
              <div className="source-slot">
                {showSource && (
                  <m.div
                    className="source-block"
                    initial={clock.done || reduced ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: SOURCE_FADE }}
                  >
                    <p className="label source-line">
                      {COPY.source(claim.room.source, claim.room.fieldDates, claim.room.n)}
                      {claim.room.note ? ` — ${claim.room.note}` : ''}
                    </p>
                    <p className="small truth-line">
                      <a href={claim.truthSource.url} target="_blank" rel="noopener noreferrer">
                        {claim.truthSource.label}
                      </a>
                      : {claim.truthSource.oneLine}
                    </p>
                  </m.div>
                )}
              </div>
              <div className="next-slot">
                {clock.done && (
                  <button type="button" className="btn" onClick={game.next} autoFocus>
                    {index + 1 < total ? COPY.next : COPY.seeResults}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
