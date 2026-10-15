import { Link } from 'react-router'
import { Header } from '../components/Header'
import { addDays, formatShort } from '../lib/day'
import { useTitle, useToday } from '../lib/hooks'
import { currentStreak, lifetime, storageAvailable } from '../lib/storage'
import { COPY } from '../tokens/copy'

function monthGrid(year: number, month: number, played: Set<string>, today: string) {
  const first = new Date(Date.UTC(year, month, 1))
  const startDow = first.getUTCDay()
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: Array<{ key: string; day: number; state: 'played' | 'missed' | 'future' } | null> = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ key, day: d, state: played.has(key) ? 'played' : key > today ? 'future' : 'missed' })
  }
  const label = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  return { label, cells }
}

export function Stats() {
  useTitle('Stats — Read the Room')
  const today = useToday()
  const life = lifetime()
  const streak = currentStreak(today)
  const played = new Set(life.playedDates)
  const [y, m] = today.split('-').map(Number)
  const months = [monthGrid(y, m - 1, played, today)]
  const prev = addDays(`${today.slice(0, 7)}-01`, -1)
  const [py, pm] = prev.split('-').map(Number)
  months.unshift(monthGrid(py, pm - 1, played, today))

  return (
    <main className="page stats">
      <Header right={COPY.stats} />
      <h1 className="sr-only">{COPY.stats}</h1>
      {life.daysPlayed === 0 ? (
        <section className="section stack">
          <p className="claim-text">{COPY.emptyStats}</p>
          <Link to="/" className="btn">{COPY.playToday}</Link>
        </section>
      ) : (
        <>
          <section className="section">
            <dl className="statlist">
              <div><dt className="label">Days played</dt><dd className="num">{life.daysPlayed}</dd></div>
              <div><dt className="label">🎯 {COPY.accuracy}</dt><dd className="num">{life.accuracyPct}%</dd></div>
              <div><dt className="label">📡 Mean read</dt><dd className="num">{life.meanRead}</dd></div>
              <div><dt className="label">{COPY.streak}</dt><dd className="num">{streak}</dd></div>
              <div><dt className="label">🦊 Fox</dt><dd className="num">{life.foxes}</dd></div>
              <div><dt className="label">🐑 Sheep</dt><dd className="num">{life.sheep}</dd></div>
              <div><dt className="label">Best read</dt><dd className="num">{life.bestRead ? `${life.bestRead.read} · ${formatShort(life.bestRead.date)}` : '—'}</dd></div>
            </dl>
          </section>
          <section className="section">
            <div className="calendars">
              {months.map((mo) => (
                <div className="calendar" key={mo.label}>
                  <p className="label">{mo.label}</p>
                  <div className="calendar-grid" role="img" aria-label={`${mo.label}: ${mo.cells.filter((c) => c?.state === 'played').length} days played`}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span className="calendar-dow label" key={i} aria-hidden="true">{d}</span>
                    ))}
                    {mo.cells.map((c, i) =>
                      c ? (
                        <span key={c.key} className={`calendar-cell ${c.state}`} title={`${c.key}${c.state === 'played' ? ' — played' : ''}`}>
                          <span className="calendar-dot" />
                        </span>
                      ) : (
                        <span key={`e${i}`} className="calendar-cell empty" />
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {!storageAvailable() && <p className="small muted">{COPY.storageOff}</p>}
      <nav className="section footer-nav" aria-label="More">
        <Link to="/">{COPY.wordmark}</Link>
        <Link to="/archive">{COPY.archive}</Link>
      </nav>
    </main>
  )
}
