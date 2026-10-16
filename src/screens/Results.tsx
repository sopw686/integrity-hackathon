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
import { calibration, scoreClaim } from '../lib/scoring'
import { SureSummary } from '../components/SureChart'
import { currentStreak, getDay as getRecord } from '../lib/storage'
import { shareResults, type ShareOutcome } from '../lib/share'
import { track } from '../lib/track'
import { COPY } from '../tokens/copy'
import type { Claim } from '../lib/types'

export function shortTitle(c: Claim): string {
  if (c.shortTitle) return c.shortTitle
  const words = c.text.replace(/\.$/, '').split(' ')
  return words.length <= 6 ? words.join(' ') : words.slice(0, 6).join(' ') + '…'
}

export function rankFor(scores: { accuracy: number; read: number }) {
  return COPY.ranks.find((r) => scores.accuracy >= r.min.accuracy && scores.read >= r.min.read) ?? COPY.ranks[COPY.ranks.length - 1]
}

export function Results() {
  const today = useToday()
  const [params] = useSearchParams()
  const dayParam = params.get('day')
  const date = dayParam && isValidDateKey(dayParam) ? dayParam : today
  const archive = date !== today
  const navigate = useNavigate()
  const day = getDay(date)
  const record = getRecord(date)
  const no = puzzleNumber(date)
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)
  const [sent, setSent] = useState(false)
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

  const complete = Boolean(day && record?.completedAt)
  useEffect(() => {
    if (!complete) navigate(archive ? `/play?day=${date}` : '/play', { replace: true })
  }, [complete, navigate, archive, date])
  if (!day || !record || !complete) return null

  const claims = dayClaims(day)
  const results = claims.map((c, i) => scoreClaim(c, record.answers[i] ?? 'false', record.guesses[i] ?? 0, record.confidence?.[i]))
  const cal = calibration(results.filter((r) => r.confidence !== undefined).map((r) => ({ confidence: r.confidence!, correct: r.correct })))
  const scores = record.scores
  const streak = currentStreak(today)
  const rank = rankFor(scores)

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
        setSent(true)
        return
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return
    }
    try {
      await navigator.clipboard.writeText(url)
      setSent(true)
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
          <p className="rank-title">{rank.title}</p>
          <p className="rank-line small">{rank.line}</p>
        </m.div>
        <div className="dials">
          <Dial icon="🎯" label={COPY.accuracy} value={scores.accuracy} max={5} display={`${scores.accuracy}/5`} animate={!calm} delay={350} />
          <Dial icon="📡" label={COPY.read} value={scores.read} max={100} display={`${scores.read}`} animate={!calm} delay={500} />
        </div>
      </section>

      <section className="section results-list">
        {results.map((r, i) => {
          const c = claims[i]
          return (
            <Link to={`/c/${c.id}`} className={`results-row ${r.correct ? 'right' : 'wrong'}`} key={c.id} style={{ ['--i' as string]: i }}>
              <span className="results-grid" aria-hidden="true">
                <MiniRoom split={c.room} label={c.room.label} guess={r.guess} verdict={r.verdict} dot={miniDot} gap={2} />
              </span>
              <span className="results-body">
                <span className="results-title serif">{shortTitle(c)}</span>
                <Badge id={r.badge} compact />
                <span className="results-delta small muted num">
                  {r.confidence !== undefined ? `${COPY.sureChip(r.confidence)} · ` : ''}
                  {COPY.youVsRoom(r.guess, c.room.pctTrue)}
                </span>
              </span>
            </Link>
          )
        })}
      </section>

      {cal && (
        <section className="section">
          <SureSummary cal={cal} />
        </section>
      )}

      <section className="section stack">
        {!archive && (
          <p className={`label streak-line${streak > 0 ? ' lit' : ''}`}>
            {streak > 0 && <span className="flame" aria-hidden="true">🔥</span>} {COPY.streak}: {COPY.streakDays(streak)}
          </p>
        )}
        {archive && <p className="label">{COPY.archiveNote}</p>}
        <button type="button" className="btn" onClick={onShare}>{COPY.share}</button>
        <p className="small muted share-outcome" role="status">
          {outcome === 'copied' || outcome === 'downloaded' ? COPY.copied : outcome === 'shared' ? COPY.shared : outcome === 'failed' ? COPY.shareFailed : ''}
        </p>
        <button type="button" className="btn secondary" onClick={onSend}>{sent ? COPY.copied : COPY.sendOne}</button>
      </section>

      <nav className="section footer-nav" aria-label="More">
        <Link to="/">{COPY.wordmark}</Link>
        <Link to="/stats">{COPY.stats}</Link>
        <Link to="/archive">{COPY.archive}</Link>
      </nav>
    </main>
  )
}
