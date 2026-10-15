import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { m } from 'motion/react'
import { Header } from '../components/Header'
import { RoomFrame } from '../components/RoomFrame'
import { RangeSlider } from '../components/RangeSlider'
import { Badge } from '../components/Badge'
import { useGame } from '../lib/game'
import { isValidDateKey, puzzleNumber } from '../lib/day'
import { describeRoom } from '../lib/geometry'
import { useDotSize, useReduced, useRevealClock, useTitle, useToday } from '../lib/hooks'
import { getDay as getRecord } from '../lib/storage'
import { BADGES, COPY } from '../tokens/copy'
import { REDUCED_CROSSFADE, SOURCE_FADE, T_BADGE, T_SOURCE } from '../tokens/motion'

export function Play() {
  const today = useToday()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const dayParam = params.get('day')
  // A live game stays on the day it started, so one begun at 11:55pm finishes as that day and counts.
  const [startDay, setStartDay] = useState(today)
  const valid = dayParam !== null && isValidDateKey(dayParam) && dayParam <= today
  const date = valid ? dayParam : startDay
  const archive = date !== startDay && date !== today

  // A future or malformed ?day= plays today instead.
  useEffect(() => {
    if (dayParam !== null && !valid) navigate('/play', { replace: true })
  }, [dayParam, valid, navigate])

  // A tab left open overnight rolls to the new puzzle unless the day it started on has a lock.
  useEffect(() => {
    if (today !== startDay && !getRecord(startDay)?.answers.length) setStartDay(today)
  }, [today, startDay])

  // Keyed by date: game state can never carry over from one day to another.
  return <PlayDay key={date} date={date} archive={archive} today={today} />
}

function PlayDay({ date, archive, today }: { date: string; archive: boolean; today: string }) {
  const game = useGame(date, archive)
  const reduced = useReduced()
  const dot = useDotSize()
  const navigate = useNavigate()
  const clock = useRevealClock(game.phase === 'reveal', reduced)
  const [moved, setMoved] = useState(false)
  const claimRef = useRef<HTMLHeadingElement>(null)
  const pinnedRef = useRef<HTMLHeadingElement>(null)
  const sliderWrap = useRef<HTMLDivElement>(null)

  const { claim, index, claims, phase, verdict, guess, current } = game
  const total = claims.length
  useTitle(claim ? `${index + 1} of ${total} — Read the Room` : 'Read the Room')

  useEffect(() => {
    if (phase === 'done') navigate(date !== today ? `/results?day=${date}` : '/results', { replace: true })
  }, [phase, navigate, date, today])

  // Keyboard flow: read the claim on arrival, move to the slider once the verdict is locked,
  // and keep focus on the claim (not <body>) once Lock unmounts.
  useEffect(() => {
    if (phase === 'verdict') {
      setMoved(false)
      claimRef.current?.focus()
    }
    if (phase === 'read') sliderWrap.current?.querySelector<HTMLInputElement>('input')?.focus()
    if (phase === 'reveal') pinnedRef.current?.focus()
  }, [phase, index])

  if (!game.day || !claim) {
    return (
      <main className="page">
        <Header right={archive ? COPY.archiveNote : `No. ${puzzleNumber(date)}`} />
        <section className="section stack">
          <p className="claim-text">No puzzle is set for this day.</p>
          <Link to="/" className="btn secondary">{COPY.back}</Link>
        </section>
      </main>
    )
  }

  const t = clock.t
  const showBadge = phase === 'reveal' && current && (clock.done || t >= (reduced ? REDUCED_CROSSFADE : T_BADGE))
  const showSource = phase === 'reveal' && (clock.done || t >= (reduced ? REDUCED_CROSSFADE : T_SOURCE))
  // The players-so-far line is part of the reveal; on the slider it would hint the guess.
  const overlay = phase === 'reveal' && game.day.roomOverlay && game.day.roomOverlay.n >= 30 ? game.day.roomOverlay.pctTrue : undefined
  // What a sighted player has seen by the time Next appears; Next reads it as its description.
  const summary = current ? `${BADGES[current.badge].name}. ${BADGES[current.badge].line} ${describeRoom(claim.room, claim.room.label)} The claim is ${claim.answer}.` : ''

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
          <h1 className="claim-pinned" ref={pinnedRef} tabIndex={-1}>{claim.text}</h1>
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
              <div className="badge-slot">
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
                  <>
                    <p id="reveal-summary" className="sr-only">{summary}</p>
                    <button type="button" className="btn" onClick={game.next} autoFocus aria-describedby="reveal-summary">
                      {index + 1 < total ? COPY.next : COPY.seeResults}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
