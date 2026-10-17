import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { m } from 'motion/react'
import { Header } from '../components/Header'
import { Evidence, Lesson } from '../components/RevealNotes'
import { getClaim } from '../lib/content'
import { formatDay } from '../lib/day'
import { useCalm, useTitle, useToday } from '../lib/hooks'
import { demoLooks, dueSecondLooks, isFixed, nextLook, recordSecondLook, type LookItem } from '../lib/secondLook'
import { sfx } from '../lib/sfx'
import { confetti } from '../lib/confetti'
import { CONFIDENCE_LEVELS } from '../lib/scoring'
import { track } from '../lib/track'
import type { Verdict } from '../lib/types'
import { COPY } from '../tokens/copy'
import { SureRow, VerdictTile } from './Play'

type Phase = 'verdict' | 'sure' | 'reveal' | 'done'

/** Retests of confident misses: verdict, how sure, then the truth and the evidence again. No room, no points. */
export function SecondLook() {
  useTitle(`${COPY.secondLook.title} — Read the Room`)
  const today = useToday()
  const [params] = useSearchParams()
  const demo = params.has('demo')
  const calm = useCalm()
  const [queue] = useState<LookItem[]>(() => (demo ? demoLooks(today) : dueSecondLooks(today)))
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>(() => (queue.length ? 'verdict' : 'done'))
  const [verdict, setVerdict] = useState<Verdict>()
  const [done, setDone] = useState<LookItem[]>([])
  const claimRef = useRef<HTMLHeadingElement>(null)
  const sureRef = useRef<HTMLParagraphElement>(null)
  const bannerRef = useRef<HTMLDivElement>(null)

  const item = queue[index]
  const claim = item ? getClaim(item.claimId) : undefined
  const last = done[done.length - 1]
  const result = phase === 'reveal' && last?.claimId === item?.claimId ? last : undefined
  const attempt = result?.attempts[result.attempts.length - 1]

  useLayoutEffect(() => {
    if (phase === 'verdict') claimRef.current?.focus()
    if (phase === 'sure') sureRef.current?.focus()
  }, [phase, index])

  const pick = (v: Verdict) => {
    if (phase !== 'verdict') return
    sfx.verdict(v)
    setVerdict(v)
    setPhase('sure')
  }
  const sure = (c: number) => {
    if (phase !== 'sure' || !item || !claim || !verdict) return
    const next = nextLook(item, claim, today, verdict, c)
    if (!demo) recordSecondLook(next)
    track('second_look', { claim: claim.id, correct: next.attempts[next.attempts.length - 1].correct, demo })
    setDone((d) => [...d, next])
    setPhase('reveal')
  }
  const advance = () => {
    sfx.whoosh()
    setVerdict(undefined)
    if (index + 1 < queue.length) {
      setIndex(index + 1)
      setPhase('verdict')
    } else setPhase('done')
  }

  useEffect(() => {
    if (phase !== 'reveal' || !attempt) return
    if (attempt.correct) {
      sfx.correct()
      if (!calm) confetti({ from: bannerRef.current, count: 40, power: 10 })
    } else sfx.wrong()
  }, [phase, attempt, calm])

  useEffect(() => {
    if (phase !== 'verdict' && phase !== 'sure') return
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (phase === 'verdict') {
        if (e.key === 't' || e.key === 'T') pick('true')
        if (e.key === 'f' || e.key === 'F') pick('false')
      } else {
        const n = Number(e.key)
        if (n >= 1 && n <= CONFIDENCE_LEVELS.length) sure(CONFIDENCE_LEVELS[n - 1])
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  const S = COPY.secondLook
  const right = done.filter((d) => d.attempts[d.attempts.length - 1]?.correct).length

  return (
    <main className="page play second-look">
      <Header right={demo ? `${S.title} · demo` : S.title} />
      {phase === 'done' ? (
        <section className="section stack">
          {done.length === 0 ? (
            <p className="claim-text">{S.none}</p>
          ) : (
            <>
              <h1 className="claim-text">{S.doneTitle(right, done.length)}</h1>
              <p className="serif">{S.doneLine}</p>
              <ul className="insight-notes">
                {done.map((d) => {
                  const c = getClaim(d.claimId)
                  return (
                    <li key={d.claimId} className="small">
                      {c?.shortTitle ?? c?.text}: {isFixed(d) ? S.fixed : S.nextIn(formatDay(d.due))}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
          <Link to="/" className="btn">{COPY.back}</Link>
        </section>
      ) : (
        item &&
        claim && (
          <>
            <div className="meta">
              <span className="label">{S.kicker(formatDay(item.firstSeen))}</span>
              <span className="label num">{COPY.claimOf(index + 1, queue.length)}</span>
            </div>
            <section className="verdict" key={claim.id}>
              <h1 className="claim-text" ref={claimRef} tabIndex={-1}>{claim.text}</h1>
              {phase === 'verdict' && (
                <div className="row verdict-row">
                  <VerdictTile v="true" onPick={pick} />
                  <VerdictTile v="false" onPick={pick} />
                </div>
              )}
              {phase === 'sure' && verdict && (
                <div className="sure">
                  <div className="sure-head">
                    <span className={`chip you-said ${verdict}`}>{COPY.youSaid(verdict)}</span>
                    <p className="label sure-question" ref={sureRef} tabIndex={-1}>{COPY.sureQuestion}</p>
                  </div>
                  <SureRow onPick={sure} />
                </div>
              )}
              {phase === 'reveal' && attempt && (
                <div className="reveal-below second-look-reveal">
                  <div className="banner-slot" ref={bannerRef} aria-live="polite">
                    <m.div
                      className={`verdict-banner ${attempt.correct ? 'right' : 'wrong'}`}
                      initial={calm ? false : { scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 15 }}
                    >
                      <span className="verdict-banner-mark" aria-hidden="true">{attempt.correct ? '✓' : '✗'}</span>
                      {attempt.correct ? COPY.correct[0] : COPY.wrong[0]}
                      <span className="verdict-banner-truth">{COPY.truthIs(claim.answer)}</span>
                    </m.div>
                  </div>
                  <div className="then-now">
                    <p className="small">{S.then(item.confidence, item.verdict)}</p>
                    <p className="small strong">
                      {COPY.sureChip(attempt.confidence)} · {attempt.correct ? S.nowRight : S.nowWrong}
                    </p>
                    {result && attempt.correct && <p className="small muted">{isFixed(result) ? S.fixed : S.nextIn(formatDay(result.due))}</p>}
                  </div>
                  <Evidence claim={claim} />
                  <Lesson claim={claim} />
                  <div className="next-slot">
                    <button type="button" className="btn next-btn" onClick={advance} autoFocus>
                      {index + 1 < queue.length ? COPY.next : COPY.seeResults}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )
      )}
    </main>
  )
}
