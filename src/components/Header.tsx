import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { COPY } from '../tokens/copy'

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="header">
      <Link to="/" className="wordmark">
        {COPY.wordmark}
      </Link>
      {right !== undefined && <span className="label header-right">{right}</span>}
    </header>
  )
}
