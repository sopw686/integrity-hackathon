import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { m } from 'motion/react'
import { Header } from '../components/Header'
import { RoomFrame } from '../components/RoomFrame'
import { RangeSlider } from '../components/RangeSlider'
import { Badge } from '../components/Badge'
import { Evidence, Lesson, RoomContext } from '../components/RevealNotes'
import { FactCheck } from '../components/FactCheck'
import { useGame } from '../lib/game'
import { isValidDateKey, puzzleNumber } from '../lib/day'
import { describeRoom } from '../lib/geometry'
import { useCalm, useCountUp, useCues, useDotSize, useReduced, useRevealClock, useTitle, useToday } from '../lib/hooks'
import { sfx } from '../lib/sfx'
import { confetti } from '../lib/confetti'
import { getDay as getRecord } from '../lib/storage'
import { BADGES, COPY } from '../tokens/copy'
import {
  COUNTDOWN_STEP,
  REDUCED_CROSSFADE,
  ROW_STAGGER,
  SOURCE_FADE,
  T_BADGE,
  T_POINTS,
  T_SOURCE,
  T_STAMP,
  T_VERDICT_BANNER,
} from '../tokens/motion'
import { callKind, CONFIDENCE_LEVELS } from '../lib/scoring'
import type { ClaimResult, Verdict } from '../lib/types'

/** Five pips across the top: done (right or wrong), the one in play, and the ones to come. */
function Pips({ total, results, index, live }: { total: number; results: ClaimResult[]; index: number; live?: ClaimResult }) {
  return (
    <span className="pips" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const r = i < results.length ? results[i] : i === index ? live : undefined
        const state = r ? (r.correct ? 'right' : 'wrong') : i === index ? 'now' : 'next'
        return <span key={i} className={`pip ${state}`} />
      })}
    </span>
  )
}

/** The running score: verdicts right, read points so far, and a combo once you string two together. */
function Hud({ accuracy, read, sure, combo, calm }: { accuracy: number; read: number; sure: number; combo: number; calm: boolean }) {
  const shown = useCountUp(read, 500, !calm)
  return (
    <div className="hud" aria-label={`Score so far: ${accuracy} right, confidence ${sure}, read ${read}`} role="group">
      <span className="hud-item num" key={`a${accuracy}`}>
        <span aria-hidden="true">🎯</span> {accuracy}
      </span>
      <span className={`hud-item num${sure < 0 ? ' neg' : ''}`} key={`s${sure}`} title="Confidence points">
        <span aria-hidden="true">🎚️</span> {COPY.surePts(sure)}
      </span>
      <span className="hud-item num" key={`r${read}`}>
        <span aria-hidden="true">📡</span> {calm ? read : shown}
      </span>
      {combo >= 2 && (
        <span className="hud-item combo num" key={`c${combo}`}>
          <span aria-hidden="true">🔥</span> {COPY.combo(combo)}
        </span>
      )}
    </div>
  )
}

function Countdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3)
  useEffect(() => {
    sfx.count(n)
    const id = window.setTimeout(() => (n > 0 ? setN(n - 1) : onDone()), COUNTDOWN_STEP * 1000 * (n > 0 ? 1 : 1.3))
    return () => window.clearTimeout(id)
  }, [n, onDone])
  return (
    <button type="button" className="countdown" onClick={onDone} aria-label={COPY.countdownSkip}>
      <span className="label countdown-kicker" aria-hidden="true">{COPY.getReady}</span>
      <m.span
        key={n}
        className={`countdown-n${n === 0 ? ' go' : ''}`}
        aria-hidden="true"
        initial={{ scale: 2.2, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 16 }}
      >
        {n > 0 ? n : COPY.go}
      </m.span>
    </button>
  )
}

/** The claim, word by word, like it is being set in type. */
function Words({ text, calm }: { text: string; calm: boolean }) {
  if (calm) return <>{text}</>
  return (
    <>
      {text.split(' ').map((w, i, all) => (
        <span className="word" key={i} style={{ ['--i' as string]: Math.min(i, 24) }}>
          {w}
          {i < all.length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  )
}

export function VerdictTile({ v, onPick }: { v: Verdict; onPick: (v: Verdict) => void }) {
  return (
    <button type="button" className={`tile tile-${v}`} onClick={() => onPick(v)}>
      <svg className="tile-icon" width={22} height={22} viewBox="0 0 22 22" aria-hidden="true">
        {v === 'true' ? <circle cx={11} cy={11} r={9} fill="currentColor" /> : <circle cx={11} cy={11} r={8.25} fill="none" stroke="currentColor" strokeWidth={1.5} />}
      </svg>
      <span className="tile-label">{v === 'true' ? COPY.true : COPY.false}</span>
      <kbd className="tile-key" aria-hidden="true">{v === 'true' ? 'T' : 'F'}</kbd>
    </button>
  )
}

/** "How sure are you?" Four push-blocks, 1–4 on the keyboard. */
export function SureRow({ onPick }: { onPick: (c: number) => void }) {
  return (
    <div className="sure-row">
      {CONFIDENCE_LEVELS.map((c, i) => (
        <button type="button" key={c} className="sure-tile" onClick={() => onPick(c)} aria-label={`${c}% — ${COPY.sureLevels[c]}`} style={{ ['--i' as string]: i }}>
          <span className="sure-pct num">{c}%</span>
          <span className="sure-word">{COPY.sureLevels[c]}</span>
          <kbd className="tile-key" aria-hidden="true">{i + 1}</kbd>
        </button>
      ))}
    </div>
  )
}

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

  // Mount the game only on the cleaned URL, or its own redirect to /results is overwritten.
  if (dayParam !== null && !valid) return null

  // Keyed by date: game state can never carry over from one day to another.
  return <PlayDay key={date} date={date} archive={archive} />
}

function PlayDay({ date, archive }: { date: string; archive: boolean }) {
  const game = useGame(date, archive)
  const reduced = useReduced()
  const calm = useCalm()
  const dot = useDotSize()
  const navigate = useNavigate()
  const clock = useRevealClock(game.phase === 'reveal', reduced)
  const [moved, setMoved] = useState(false)
  const claimRef = useRef<HTMLHeadingElement>(null)
  const pinnedRef = useRef<HTMLHeadingElement>(null)
  const sliderWrap = useRef<HTMLDivElement>(null)
  const sureRef = useRef<HTMLParagraphElement>(null)
  const roomRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const { claim, index, claims, phase, verdict, confidence, guess, current, results } = game
  const total = claims.length
  // The countdown opens a fresh day once, on the first claim, when things are allowed to move.
  const [counting, setCounting] = useState(() => !calm && results.length === 0 && phase === 'verdict' && Boolean(claim))
  const endCount = useRef(() => setCounting(false)).current
  useTitle(claim ? `${index + 1} of ${total} — Read the Room` : 'Read the Room')

  // Always name the day: after midnight a bare /results would resolve to the next puzzle.
  useEffect(() => {
    if (phase === 'done') navigate(`/results?day=${date}`, { replace: true, state: { fresh: true } })
  }, [phase, navigate, date])

  // Keyboard flow: read the claim on arrival, move to the slider once the verdict is locked,
  // and keep focus on the claim (not <body>) once Lock unmounts.
  // Layout effect, so focus lands in the same commit as the screen (before the next keypress).
  useLayoutEffect(() => {
    // Only claim focus when nothing on this screen holds it (the button that brought us here was removed).
    const free = () => {
      const a = document.activeElement
      return !a || a === document.body || !claimRef.current?.closest('main')?.contains(a)
    }
    if (phase === 'verdict') {
      setMoved(false)
      if (free()) claimRef.current?.focus()
      // Arriving from another screen the first focus can be dropped by the browser's focus fixup; retry next frame.
      const id = requestAnimationFrame(() => {
        if (free()) claimRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
    if (phase === 'sure') sureRef.current?.focus()
    if (phase === 'read') sliderWrap.current?.querySelector<HTMLInputElement>('input')?.focus()
    if (phase === 'reveal') pinnedRef.current?.focus()
  }, [phase, index, counting])

  const pick = (v: Verdict) => {
    if (phase !== 'verdict' || counting) return
    sfx.verdict(v)
    game.setVerdict(v)
  }
  const check = () => {
    if (phase !== 'verdict' || counting) return
    sfx.tap()
    game.check()
  }
  const sure = (c: number) => {
    if (phase !== 'sure') return
    sfx.tap()
    game.setConfidence(c)
  }
  const lock = () => {
    sfx.lock()
    game.lock()
  }
  const next = () => {
    sfx.whoosh()
    game.next()
  }

  // T / F call it from the keyboard; 1–4 say how sure.
  useEffect(() => {
    if ((phase !== 'verdict' && phase !== 'sure') || counting) return
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (phase === 'verdict') {
        if (e.key === 't' || e.key === 'T') pick('true')
        if (e.key === 'f' || e.key === 'F') pick('false')
        if (e.key === 'c' || e.key === 'C') check()
      } else {
        const n = Number(e.key)
        if (n >= 1 && n <= CONFIDENCE_LEVELS.length) sure(CONFIDENCE_LEVELS[n - 1])
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const t = clock.t
  const at = (full: number) => phase === 'reveal' && (clock.done || t >= (reduced ? REDUCED_CROSSFADE : full))
  const bannerOn = at(T_VERDICT_BANNER) && current
  const pointsOn = at(T_POINTS) && current
  const showBadge = at(T_BADGE) && current
  const showSource = at(T_SOURCE)
  const fresh = !clock.done && !reduced
  const thud = !reduced && Number.isFinite(t) && phase === 'reveal' && t >= T_STAMP && t < T_STAMP + 0.32

  // Sound, haptics and confetti, cued off the same clock as the grid.
  const fullCues: Array<[number, () => void]> = [
    ...Array.from({ length: 10 }, (_, r) => [ROW_STAGGER * r + 0.01, () => sfx.row(r)] as [number, () => void]),
    [T_STAMP, () => sfx.stamp()],
    [
      T_VERDICT_BANNER,
      () => {
        if (!current) return
        if (current.correct) {
          sfx.correct()
          confetti({ from: bannerRef.current ?? roomRef.current, count: 46, power: 10 })
        } else sfx.wrong()
      },
    ],
    [
      T_POINTS,
      () => {
        if (!current?.readPoints) return
        sfx.points()
        if (current.error <= 3) {
          sfx.bullseye()
          confetti({ from: roomRef.current, count: 70, power: 13 })
        }
      },
    ],
    [
      T_BADGE,
      () => {
        sfx.badge()
        if (current?.badge === 'fox') confetti({ rain: true, count: 120 })
      },
    ],
  ]
  const reducedCues: Array<[number, () => void]> = [
    [REDUCED_CROSSFADE, () => (current?.correct ? sfx.correct() : sfx.wrong())],
  ]
  useCues(phase === 'reveal' ? t : 0, reduced ? reducedCues : fullCues, `${index}-${phase}`)

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

  // The players-so-far line is part of the reveal; on the slider it would hint the guess.
  const overlay = phase === 'reveal' && game.day.roomOverlay && game.day.roomOverlay.n >= 30 ? game.day.roomOverlay.pctTrue : undefined
  // What a sighted player has seen by the time Next appears; Next reads it as its description.
  const summary = current ? `${BADGES[current.badge].name}. ${BADGES[current.badge].line} ${describeRoom(claim.room, claim.room.label)} The claim is ${claim.answer}.` : ''

  // Score so far, counting the claim on screen once its moment has landed.
  const counted = [...results, ...(bannerOn && current ? [current] : [])]
  const accuracy = counted.filter((r) => r.correct).length
  const read = results.reduce((s, r) => s + r.readPoints, 0) + (pointsOn && current ? current.readPoints : 0)
  const sureSum = counted.reduce((s, r) => s + r.surePoints, 0)
  const kind = current ? callKind(current.confidence, current.correct) : undefined
  const question = COPY.sliderQuestionFor(claim.room.label)
  let combo = 0
  for (let i = counted.length - 1; i >= 0 && counted[i].correct; i--) combo++

  const okLine = COPY.correct[index % COPY.correct.length]
  const noLine = COPY.wrong[index % COPY.wrong.length]

  return (
    <main className="page play">
      <Header right={archive ? COPY.archiveNote : `No. ${puzzleNumber(date)}`} />
      <div className="meta">
        <span className="label">
          {claim.category}
          {claim.difficulty === 3 && <span className="hard-chip">{index === total - 1 ? COPY.finalHard : COPY.hard}</span>}
        </span>
        <span className="meta-right">
          <Pips total={total} results={results} index={index} live={bannerOn ? current : undefined} />
          <span className="label num">{COPY.claimOf(index + 1, total)}</span>
        </span>
      </div>
      <Hud accuracy={accuracy} read={read} sure={sureSum} combo={combo} calm={calm} />

      {(phase === 'verdict' || phase === 'sure') && (
        <section className="verdict" key={claim.id}>
          {claim.seenIn && <p className="label seen-in">{COPY.seenIn(claim.seenIn)}</p>}
          <h1 className="claim-text" ref={claimRef} tabIndex={-1}>
            {counting ? claim.text : <Words text={claim.text} calm={calm} />}
          </h1>
          {phase === 'verdict' ? (
            <>
              <div className="row verdict-row">
                <VerdictTile v="true" onPick={pick} />
                <VerdictTile v="false" onPick={pick} />
              </div>
              <div className="factcheck-slot">
                <FactCheck claim={claim} checked={game.checked} checksLeft={game.checksLeft} onCheck={check} canCheck={!counting} />
              </div>
            </>
          ) : (
            verdict && (
              <div className="sure">
                <div className="sure-head">
                  <span className={`chip you-said ${verdict}`}>{COPY.youSaid(verdict)}</span>
                  <p className="label sure-question" ref={sureRef} tabIndex={-1}>{COPY.sureQuestion}</p>
                </div>
                <SureRow onPick={sure} />
                {game.checked && <FactCheck claim={claim} checked checksLeft={0} onCheck={check} canCheck={false} focusOnOpen={false} />}
              </div>
            )
          )}
        </section>
      )}

      {(phase === 'read' || phase === 'reveal') && verdict && (
        <section className="read" key={`${claim.id}-read`}>
          <h1 className="claim-pinned" ref={pinnedRef} tabIndex={-1}>{claim.text}</h1>
          <div className="locked-row">
            <span className={`chip you-said ${verdict}`}>{COPY.youSaid(verdict)}</span>
            {confidence !== undefined && <span className="chip sure-chip num">{COPY.sureChip(confidence)}</span>}
            {game.checked && <span className="chip checked-chip">{COPY.factCheck.chip}</span>}
            {phase === 'read' && <span className="label question">{question}</span>}
            {pointsOn && current && (
              <m.span
                className={`points${current.error <= 3 ? ' bullseye' : ''}${current.readPoints === 0 ? ' zero' : ''}`}
                initial={fresh ? { y: 14, opacity: 0, scale: 0.6 } : false}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <span className="num">📡 {COPY.readPts(current.readPoints)}</span>
                {current.error <= 7 && <span className="points-note">{current.error <= 3 ? COPY.bullseye : COPY.closeRead}</span>}
              </m.span>
            )}
          </div>

          <div className="banner-slot" ref={bannerRef} aria-live="polite">
            {bannerOn && current && (
              <m.div
                className={`verdict-banner ${current.correct ? 'right' : 'wrong'}`}
                initial={fresh ? { scale: 0.3, opacity: 0, rotate: current.correct ? -6 : 6 } : false}
                animate={current.correct || !fresh ? { scale: 1, opacity: 1, rotate: 0 } : { scale: 1, opacity: 1, rotate: 0, x: [0, -10, 9, -6, 4, 0] }}
                transition={{ type: 'spring', stiffness: 520, damping: 15, x: { duration: 0.45, delay: 0.1 } }}
              >
                <span className="verdict-banner-mark" aria-hidden="true">{current.correct ? '✓' : '✗'}</span>
                {current.correct ? okLine : noLine}
                <span className="verdict-banner-truth">{COPY.truthIs(claim.answer)}</span>
              </m.div>
            )}
            {bannerOn && current && kind && (
              <p className={`label call-kind ${kind}`}>
                {COPY.callKind[kind](current.confidence!)}{' '}
                <span className="call-pts num">{COPY.surePts(current.surePoints)}</span>
              </p>
            )}
          </div>

          <div className={`room-center${phase === 'reveal' && fresh && t < 0.36 ? ' revealing' : ''}${thud ? ' thud' : ''}`} ref={roomRef}>
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
                  sfx.slide(v)
                  game.setGuess(v)
                }}
                onEnter={lock}
                label={question}
              />
              <button type="button" className={`btn lock-btn${moved ? ' armed' : ''}`} onClick={lock}>
                {COPY.lock}
              </button>
            </div>
          )}

          {phase === 'reveal' && current && (
            <div className="reveal-below">
              <div className="evidence-slot" aria-live="polite">
                {showBadge && (
                  <m.div
                    className="stack-tight"
                    initial={fresh ? { opacity: 0, y: 6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: SOURCE_FADE }}
                  >
                    <Evidence claim={claim} />
                    <Lesson claim={claim} />
                  </m.div>
                )}
              </div>
              <div className="source-slot">
                {showSource && (
                  <m.div initial={fresh ? { opacity: 0, y: 6 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: SOURCE_FADE }}>
                    <RoomContext claim={claim} guess={current.guess} badge={<Badge id={current.badge} animate={fresh} />} />
                  </m.div>
                )}
              </div>
              <div className="next-slot">
                {clock.done && (
                  <>
                    {/* hidden, not sr-only: read only as Next's description, not again in browse mode */}
                    <p id="reveal-summary" hidden>{summary}</p>
                    <button type="button" className="btn next-btn" onClick={next} autoFocus aria-describedby="reveal-summary">
                      {index + 1 < total ? COPY.next : COPY.seeResults}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      )}
      {counting && createPortal(<Countdown onDone={endCount} />, document.body)}
    </main>
  )
}
