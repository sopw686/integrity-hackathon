import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { COPY } from '../tokens/copy'
import { setSound, useSoundOn } from '../lib/sfx'

function SoundToggle() {
  const on = useSoundOn()
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={on}
      aria-label={COPY.soundOn}
      title={on ? COPY.soundOn : COPY.soundOff}
      onClick={() => setSound(!on)}
    >
      <svg width={20} height={20} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
        {on ? (
          <>
            <path d="M13 7a4 4 0 0 1 0 6" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
            <path d="M15.4 4.6a7.4 7.4 0 0 1 0 10.8" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
          </>
        ) : (
          <path d="M13 7.5l5 5M18 7.5l-5 5" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
        )}
      </svg>
    </button>
  )
}

export function Header({ right }: { right?: ReactNode }) {
  return (
    <header className="header">
      <Link to="/" className="wordmark">
        {COPY.wordmark}
      </Link>
      <span className="header-tools">
        {right !== undefined && <span className="label header-right">{right}</span>}
        <SoundToggle />
      </span>
    </header>
  )
}
