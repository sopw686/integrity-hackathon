import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { m } from 'motion/react'
import { Header } from '../components/Header'
import { Dial } from '../components/Dial'
import { Badge } from '../components/Badge'
import { MiniRoom } from '../components/Room'
import { dayClaims, getDay } from '../lib/content'
import { formatLong, isValidDateKey, puzzleNumber } from '../lib/day'
import { useCalm, useDotSize, useTitle, useToday } from '../lib/hooks'
import { sfx } from '../lib/sfx'
import { confetti } from '../lib/confetti'
import { calibration, callKind, scoreClaim, withTotals } from '../lib/scoring'
import { dayInsight, shortTitle } from '../lib/insight'
import { SureSummary } from '../components/SureChart'
import { currentStreak, getDay as getRecord } from '../lib/storage'
import { shareOutcomeText, shareResults, type ShareOutcome } from '../lib/share'
import { track } from '../lib/track'
import { COPY } from '../tokens/copy'
import { queuedFrom } from '../lib/secondLook'

export function Results() {
  const today = useToday()
  const [params] = useSearchParams()
  const dayParam = params.get('day')
  const valid = dayParam !== null && isValidDateKey(dayParam) && dayParam <= today
  const date = valid ? dayParam : today
  const past = date !== today
  const navigate = useNavigate()
  const day = getDay(date)
  const record = getRecord(date)
  const no = puzzleNumber(date)
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)
  const [sent, setSent] = useState<'shared' | 'copied' | null>(null)
  const miniDot = useDotSize() === 18 ? 5 : 4
  const calm = useCalm()
  // Celebrate only on arrival from the last reveal, not on every revisit.
  const fresh = Boolean((useLocation().state as { fresh?: boolean } | null)?.fresh) && !calm
  useTitle(`Results No. ${no} — Read the Room`)

  useEffect(() => {
    if (!fresh || !record?.completedAt) return
    const s = record.scores
    const big = s.accuracy >= 4 || s.read >= 70
    const id = window.setTimeout(() => {
      sfx.fanfare()
      if (big) {
        confetti({ rain: true, count: 160 })
        confetti({ y: window.innerHeight * 0.3, count: 70, power: 14 })
      } else if (s.accuracy >= 3) confetti({ y: window.innerHeight * 0.3, count: 40 })
    }, 350)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh])

  // Today's result must have been played live; an archive-flagged record for today (an early peek) is not it.
  const complete = Boolean(day && record?.completedAt && (past || !record.archive))
  useEffect(() => {
    if (!complete) navigate(past ? `/play?day=${date}` : '/play', { replace: true })
    else if (dayParam !== null && !valid) navigate('/results', { replace: true })
  }, [complete, navigate, past, date, dayParam, valid])
  if (!day || !record || !complete) return null
  // Labels follow how the day was played, not whether it is still today.
  const archive = Boolean(record.archive)

  const claims = dayClaims(day)
  const results = claims.map((c, i) => {
    const r = scoreClaim(c, record.answers[i] ?? 'false', record.guesses[i] ?? 0, record.confidence?.[i])
    return record.checked?.includes(i) ? { ...r, checked: true } : r
  })
  const queued = archive ? [] : queuedFrom(date)
  const queuedTitle = queued.length === 1 ? claims.find((c) => c.id === queued[0].claimId) : undefined
  const cal = calibration(results.filter((r) => r.confidence !== undefined).map((r) => ({ confidence: r.confidence!, correct: r.correct })))
  const scores = withTotals(record.scores, results)
  const streak = currentStreak(today)
  // Days played before the fact-check existed have no `checked` list; don't scold those for not using it.
  const insight = dayInsight(claims, results, record.checked !== undefined)

  // "The one that got you": a wrong verdict with the largest read error; failing that, the largest error.
  const wrong = results.filter((r) => !r.correct)
  const gotYou = (wrong.length ? wrong : results).slice().sort((a, b) => b.error - a.error)[0]

  const onShare = async () => {
    track('share', { date })
    const res = await shareResults({
      puzzleNumber: no,
      accuracy: scores.accuracy,
      read: scores.read,
      badges: results.map((r) => r.badge),
      rows: claims.map((c, i) => ({ split: c.room, guess: record.guesses[i] ?? 0, verdict: record.answers[i] ?? 'false' })),
    })
    setOutcome(res)
  }

  const onSend = async () => {
    const url = `${window.location.origin}/c/${gotYou.claimId}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ url, title: 'Read the Room' })
        setSent('shared')
        return
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setSent('copied')
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <main className="page results">
      <Header right={archive ? COPY.archiveNote : `No. ${no}`} />
      <section className="section">
        <h1 className="label dateline">No. {no} · {formatLong(date)}</h1>
        <m.div
          className="rank"
          initial={calm ? false : { scale: 1.8, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}
        >
          <p className="rank-title">{insight.title}</p>
          <p className="rank-line">{insight.line}</p>
        </m.div>
        {insight.notes.length > 0 && (
          <ul className="insight-notes">
            {insight.notes.map((n) => (
              <li key={n} className="small">{n}</li>
            ))}
          </ul>
        )}
        {insight.check && <p className="small factcheck-note">🔎 {insight.check}</p>}
        {queued.length > 0 && (
          <p className="small second-look-note">
            🔁 {queuedTitle ? COPY.secondLook.queued(shortTitle(queuedTitle)) : COPY.secondLook.queuedMany(queued.length)}
          </p>
        )}
        <div className="score-line">
          <span className="label">⭐ {COPY.score}</span>
          <span className="score-total num">{scores.total}</span>
          <span className="small muted num">{COPY.scoreParts(scores.accuracy * 10, scores.sure, Math.round(scores.read / 4))}</span>
        </div>
      </section>

      {cal && (
        <section className="section">
          <SureSummary cal={cal} />
        </section>
      )}

      <section className="section">
        <div className="dials">
          <Dial icon="🎯" label={COPY.accuracy} value={scores.accuracy} max={5} display={`${scores.accuracy}/5`} animate={!calm} delay={350} />
          <Dial icon="📡" label={COPY.read} value={scores.read} max={100} display={`${scores.read}`} animate={!calm} delay={500} />
        </div>
      </section>

      <section className="section results-list">
        {results.map((r, i) => {
          const c = claims[i]
          return (
            <Link to={`/c/${c.id}?day=${date}`} className={`results-row ${r.correct ? 'right' : 'wrong'}`} key={c.id} style={{ ['--i' as string]: i }}>
              <span className="results-grid" aria-hidden="true">
                <MiniRoom split={c.room} label={c.room.label} guess={r.guess} verdict={r.verdict} dot={miniDot} gap={2} />
              </span>
              <span className="results-body">
                <span className="results-title serif">{shortTitle(c)}</span>
                <Badge id={r.badge} compact />
                <span className="results-delta small muted num">
                  {r.confidence !== undefined ? `${COPY.sureChip(r.confidence)} (${COPY.surePts(r.surePoints)}) · ` : ''}
                  {COPY.youVsRoom(r.guess, c.room.pctTrue)}
                  {c.room.kind === 'illustrative' ? ` · ${COPY.demoCrowdShort.toLowerCase()}` : ''}
                  {r.checked ? ` · 🔎 ${COPY.factCheck.resultsTag}` : ''}
                </span>
                {callKind(r.confidence, r.correct) === 'confident-miss' && <span className="label call-kind confident-miss">{COPY.callKindShort['confident-miss']}</span>}
              </span>
            </Link>
          )
        })}
      </section>

      <section className="section stack">
        {!archive && (
          <p className={`label streak-line${streak > 0 ? ' lit' : ''}`}>
            {streak > 0 && <span className="flame" aria-hidden="true">🔥</span>} {COPY.streak}: {COPY.streakDays(streak)}
          </p>
        )}
        {archive && <p className="label">{COPY.archiveNote}</p>}
        <button type="button" className="btn" onClick={onShare}>{COPY.share}</button>
        <p className="small muted share-outcome" role="status">
          {shareOutcomeText(outcome)}
        </p>
        <button type="button" className="btn secondary" onClick={onSend}>{sent === 'shared' ? COPY.shared : sent === 'copied' ? COPY.copied : COPY.sendOne}</button>
      </section>

      <nav className="section footer-nav" aria-label="More">
        <Link to="/">{COPY.wordmark}</Link>
        <Link to="/stats">{COPY.stats}</Link>
        <Link to="/archive">{COPY.archive}</Link>
      </nav>
    </main>
  )
}
