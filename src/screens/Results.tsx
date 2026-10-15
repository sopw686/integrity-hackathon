import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Header } from '../components/Header'
import { Dial } from '../components/Dial'
import { Badge } from '../components/Badge'
import { MiniRoom } from '../components/Room'
import { dayClaims, getDay } from '../lib/content'
import { formatLong, isValidDateKey, puzzleNumber } from '../lib/day'
import { useDotSize, useTitle, useToday } from '../lib/hooks'
import { scoreClaim } from '../lib/scoring'
import { currentStreak, getDay as getRecord } from '../lib/storage'
import { shareOutcomeText, shareResults, type ShareOutcome } from '../lib/share'
import { track } from '../lib/track'
import { COPY } from '../tokens/copy'
import type { Claim } from '../lib/types'

export function shortTitle(c: Claim): string {
  if (c.shortTitle) return c.shortTitle
  const words = c.text.replace(/\.$/, '').split(' ')
  return words.length <= 6 ? words.join(' ') : words.slice(0, 6).join(' ') + '…'
}

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
  useTitle(`Results No. ${no} — Read the Room`)

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
  const results = claims.map((c, i) => scoreClaim(c, record.answers[i] ?? 'false', record.guesses[i] ?? 0))
  const scores = record.scores
  const streak = currentStreak(today)

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
        <div className="dials">
          <Dial icon="🎯" label={COPY.accuracy} value={scores.accuracy} max={5} display={`${scores.accuracy}/5`} />
          <Dial icon="📡" label={COPY.read} value={scores.read} max={100} display={`${scores.read}`} />
        </div>
      </section>

      <section className="section results-list">
        {results.map((r, i) => {
          const c = claims[i]
          return (
            <Link to={`/c/${c.id}?day=${date}`} className="results-row" key={c.id}>
              <span className="results-grid" aria-hidden="true">
                <MiniRoom split={c.room} label={c.room.label} guess={r.guess} verdict={r.verdict} dot={miniDot} gap={2} />
              </span>
              <span className="results-body">
                <span className="results-title serif">{shortTitle(c)}</span>
                <Badge id={r.badge} compact />
                <span className="results-delta small muted num">{COPY.youVsRoom(r.guess, c.room.pctTrue)}</span>
              </span>
            </Link>
          )
        })}
      </section>

      <section className="section stack">
        {!archive && <p className="label">{COPY.streak}: {COPY.streakDays(streak)}</p>}
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
