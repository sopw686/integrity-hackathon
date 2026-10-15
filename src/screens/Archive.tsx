import { Link } from 'react-router'
import { Header } from '../components/Header'
import { allDayDates } from '../lib/content'
import { formatLong, puzzleNumber } from '../lib/day'
import { useTitle, useToday } from '../lib/hooks'
import { getDay as getRecord } from '../lib/storage'
import { COPY } from '../tokens/copy'

export function Archive() {
  useTitle('Archive — Read the Room')
  const today = useToday()
  const past = allDayDates().filter((d) => d < today).reverse()

  return (
    <main className="page archive">
      <Header right={COPY.archive} />
      <section className="section">
        <h1 className="label archive-title">{COPY.archiveNote}</h1>
      </section>
      {past.length === 0 ? (
        <section className="section stack">
          <p className="claim-text">{COPY.emptyArchive}</p>
          <Link to="/" className="btn">{COPY.playToday}</Link>
        </section>
      ) : (
        <section className="section archive-list">
          {past.map((d) => {
            const rec = getRecord(d)
            const done = Boolean(rec?.completedAt)
            return (
              <div className="archive-row" key={d}>
                <span className="archive-no label num">No. {puzzleNumber(d)}</span>
                <span className="archive-date serif">{formatLong(d)}</span>
                {done && rec ? (
                  <Link to={`/results?day=${d}`} className="archive-action label num">
                    🎯 {rec.scores.accuracy}/5 · 📡 {rec.scores.read}
                  </Link>
                ) : (
                  <Link to={`/play?day=${d}`} className="archive-action label">
                    {COPY.play}
                  </Link>
                )}
              </div>
            )
          })}
        </section>
      )}
      <nav className="section footer-nav" aria-label="More">
        <Link to="/">{COPY.wordmark}</Link>
        <Link to="/stats">{COPY.stats}</Link>
      </nav>
    </main>
  )
}
