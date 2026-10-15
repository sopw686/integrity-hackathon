import { Link } from 'react-router'
import { Header } from '../components/Header'
import { COPY } from '../tokens/copy'
import { useTitle } from '../lib/hooks'

export function NotFound() {
  useTitle('Not found — Read the Room')
  return (
    <main className="page">
      <Header />
      <section className="section stack">
        <h1 className="claim-text">{COPY.notFound}</h1>
        <Link to="/" className="btn secondary">
          {COPY.playToday}
        </Link>
      </section>
    </main>
  )
}
