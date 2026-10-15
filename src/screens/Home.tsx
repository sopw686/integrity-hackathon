import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Header } from '../components/Header'
import { Dial } from '../components/Dial'
import { HowToDialog } from '../components/HowToDialog'
import { getDay, dayClaims } from '../lib/content'
import { formatLong, puzzleNumber } from '../lib/day'
import { useTitle, useToday } from '../lib/hooks'
import { currentStreak, getDay as getRecord, storageAvailable } from '../lib/storage'
import { shareResults, type ShareOutcome } from '../lib/share'
import { COPY } from '../tokens/copy'
import { track } from '../lib/track'

export function Home() {
  useTitle('Read the Room')
  const today = useToday()
  const navigate = useNavigate()
  const day = getDay(today)
  const no = puzzleNumber(today)
  const record = getRecord(today)
  const done = Boolean(record?.completedAt && !record.archive)
  const streak = currentStreak(today)
  const [howTo, setHowTo] = useState(false)
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null)

  const onShare = async () => {
    if (!day || !record) return
    const claims = dayClaims(day)
    track('share', { date: today })
    const res = await shareResults({
      puzzleNumber: no,
      accuracy: record.scores.accuracy,
      read: record.scores.read,
      badges: record.badges,
      rows: claims.map((c, i) => ({ split: c.room, guess: record.guesses[i] ?? 0, verdict: record.answers[i] ?? 'false' })),
    })
    setOutcome(res)
  }

  return (
    <main className="page">
      <Header right={`No. ${no}`} />
      <section className="section home-top">
        <p className="label dateline">
          No. {no} · {formatLong(today)}
        </p>
        <h1 className="claim-text home-tagline">{COPY.tagline}</h1>
        <p className="small muted home-roomis">{COPY.roomIs}</p>
      </section>
      <section className="section stack">
        {!day && (
          <>
            <p className="muted">No puzzle is set for today.</p>
            <Link to="/archive" className="btn secondary">{COPY.archive}</Link>
          </>
        )}
        {day && !done && (
          <>
            <button type="button" className="btn" onClick={() => { track('play_start', { date: today }); navigate('/play') }}>
              {COPY.play}
            </button>
            <div className="home-meta">
              <span className="chip">{COPY.streak}: {COPY.streakDays(streak)}</span>
              <button type="button" className="link-like" onClick={() => setHowTo(true)}>
                {COPY.howToPlay}
              </button>
            </div>
          </>
        )}
        {day && done && record && (
          <>
            <div className="dials">
              <Dial icon="🎯" label={COPY.accuracy} value={record.scores.accuracy} max={5} display={`${record.scores.accuracy}/5`} />
              <Dial icon="📡" label={COPY.read} value={record.scores.read} max={100} display={`${record.scores.read}`} />
            </div>
            <button type="button" className="btn" onClick={onShare}>
              {COPY.share}
            </button>
            <p className="small muted share-outcome" role="status">
              {outcome === 'copied' || outcome === 'downloaded' ? COPY.copied : outcome === 'shared' ? COPY.shared : outcome === 'failed' ? COPY.shareFailed : ''}
            </p>
            <div className="home-meta">
              <span className="chip">{COPY.streak}: {COPY.streakDays(streak)}</span>
              <Link to="/results" className="btn quiet link-like">{COPY.seeResults}</Link>
            </div>
          </>
        )}
      </section>
      <nav className="section footer-nav" aria-label="More">
        <Link to="/stats">{COPY.stats}</Link>
        <Link to="/archive">{COPY.archive}</Link>
      </nav>
      {!storageAvailable() && <p className="small muted">{COPY.storageOff}</p>}
      <HowToDialog open={howTo} onOpenChange={setHowTo} />
    </main>
  )
}
