import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Header } from '../components/Header'
import { Dial } from '../components/Dial'
import { HowToDialog } from '../components/HowToDialog'
import { getDay, dayClaims } from '../lib/content'
import { MiniRoom } from '../components/Room'
import { addDays, msUntilNextPuzzle } from '../lib/day'
import { formatLong, puzzleNumber } from '../lib/day'
import { useCalm, useDotSize, useTitle, useToday } from '../lib/hooks'
import { LivingRoom } from '../components/LivingRoom'
import { sfx } from '../lib/sfx'
import { currentStreak, getDay as getRecord, hasSeenHowTo, markHowToSeen, storageAvailable } from '../lib/storage'
import { shareResults, type ShareOutcome } from '../lib/share'
import { COPY } from '../tokens/copy'
import { track } from '../lib/track'

function NextIn() {
  const [ms, setMs] = useState(() => msUntilNextPuzzle())
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNextPuzzle()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const s = Math.floor(ms / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <p className="next-in">
      <span className="label">{COPY.nextIn}</span>
      <span className="next-in-clock num">{pad(Math.floor(s / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}</span>
    </p>
  )
}

function StreakChip({ streak }: { streak: number }) {
  return (
    <span className={`chip streak-chip${streak > 0 ? ' lit' : ''}`}>
      {streak > 0 && <span className="flame" aria-hidden="true">🔥</span>}
      {COPY.streak}: {COPY.streakDays(streak)}
    </span>
  )
}

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
  const calm = useCalm()
  const miniDot = useDotSize() === 18 ? 5 : 4
  const yesterdayKey = addDays(today, -1)
  const yesterday = getDay(yesterdayKey)
  const yesterdayRecord = getRecord(yesterdayKey)

  // First visit: open How to play once. Never when storage is off (it would open every time).
  useEffect(() => {
    if (storageAvailable() && !hasSeenHowTo()) setHowTo(true)
  }, [])
  const closeHowTo = (open: boolean) => {
    setHowTo(open)
    if (!open) markHowToSeen()
  }
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
        <div className="home-hero">
          <h1 className="claim-text home-tagline">{COPY.tagline}</h1>
          <LivingRoom calm={calm} dot={miniDot === 5 ? 11 : 9} gap={miniDot === 5 ? 5 : 4} />
        </div>
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
            <button type="button" className="btn play-btn" onClick={() => { sfx.verdict('true'); track('play_start', { date: today }); navigate('/play') }}>
              {COPY.play}
              <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true" className="play-arrow"><path d="M5 3l9 6-9 6z" fill="currentColor" /></svg>
            </button>
            <div className="home-meta">
              <StreakChip streak={streak} />
              <button type="button" className="link-like" onClick={() => setHowTo(true)}>
                {COPY.howToPlay}
              </button>
            </div>
          </>
        )}
        {day && done && record && (
          <>
            <div className="dials">
              <Dial icon="🎯" label={COPY.accuracy} value={record.scores.accuracy} max={5} display={`${record.scores.accuracy}/5`} animate={!calm} />
              <Dial icon="📡" label={COPY.read} value={record.scores.read} max={100} display={`${record.scores.read}`} animate={!calm} delay={150} />
            </div>
            <NextIn />
            <button type="button" className="btn" onClick={onShare}>
              {COPY.share}
            </button>
            <p className="small muted share-outcome" role="status">
              {outcome === 'copied' || outcome === 'downloaded' ? COPY.copied : outcome === 'shared' ? COPY.shared : outcome === 'failed' ? COPY.shareFailed : ''}
            </p>
            <div className="home-meta">
              <StreakChip streak={streak} />
              <Link to="/results" className="btn quiet link-like">{COPY.seeResults}</Link>
            </div>
          </>
        )}
      </section>
      {yesterday && (
        <section className="section yesterday">
          <div className="yesterday-head">
            <span className="label">{COPY.yesterday} · No. {puzzleNumber(yesterdayKey)}</span>
            <Link to={yesterdayRecord?.completedAt ? `/results?day=${yesterdayKey}` : `/play?day=${yesterdayKey}`} className="link-like">
              {yesterdayRecord?.completedAt ? COPY.seeResults : COPY.playIt}
            </Link>
          </div>
          <Link to={`/play?day=${yesterdayKey}`} className="yesterday-rooms" aria-label={`Yesterday’s five rooms, No. ${puzzleNumber(yesterdayKey)}. Play it from the archive.`}>
            {dayClaims(yesterday).map((c, i) => (
              <span className="yesterday-room" key={c.id} aria-hidden="true">
                <MiniRoom split={c.room} label={c.room.label} guess={yesterdayRecord?.guesses[i]} verdict={yesterdayRecord?.answers[i]} dot={miniDot} gap={2} />
              </span>
            ))}
          </Link>
        </section>
      )}
      <nav className="section footer-nav" aria-label="More">
        <Link to="/stats">{COPY.stats}</Link>
        <Link to="/archive">{COPY.archive}</Link>
      </nav>
      {!storageAvailable() && <p className="small muted">{COPY.storageOff}</p>}
      <HowToDialog open={howTo} onOpenChange={closeHowTo} />
    </main>
  )
}
