import { useEffect, useRef } from 'react'
import type { Claim } from '../lib/types'
import { COPY } from '../tokens/copy'

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** The organization only ("California Secretary of State"), never the page title, which can give the answer away. */
export function authorityOf(claim: Claim): string {
  return claim.truthSource.label.split(/[:,(]/)[0].trim()
}

/**
 * The day's one fact-check. Before calling a claim, the player can leave it and go to the authority
 * that settles it, the way professional fact-checkers read laterally instead of studying the post.
 * One per day, so spending it is itself a judgment about which claim they're least sure of.
 */
export function FactCheck({ claim, checked, checksLeft, onCheck, canCheck, focusOnOpen = true }: { claim: Claim; checked: boolean; checksLeft: number; onCheck: () => void; canCheck: boolean; focusOnOpen?: boolean }) {
  const linkRef = useRef<HTMLAnchorElement>(null)
  useEffect(() => {
    if (checked && focusOnOpen) linkRef.current?.focus()
  }, [checked, focusOnOpen])

  if (checked) {
    const host = hostOf(claim.truthSource.url)
    return (
      <div className="factcheck-card" role="region" aria-label={COPY.factCheck.head}>
        <p className="label factcheck-head">🔎 {COPY.factCheck.head}</p>
        <p className="small factcheck-line">{COPY.factCheck.line}</p>
        <a className="factcheck-link" ref={linkRef} href={claim.truthSource.url} target="_blank" rel="noopener noreferrer">
          <span className="evidence-org">{authorityOf(claim)}</span>
          <span className="small muted">
            {host} <span aria-hidden="true">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </span>
        </a>
        <p className="small muted factcheck-then">{COPY.factCheck.then}</p>
      </div>
    )
  }
  if (!canCheck) return null
  if (checksLeft <= 0) return <p className="small muted factcheck-used">{COPY.factCheck.used}</p>
  return (
    <button type="button" className="factcheck-btn" onClick={onCheck}>
      <span aria-hidden="true">🔎</span> {COPY.factCheck.button}
      <span className="factcheck-left num">{COPY.factCheck.left(checksLeft)}</span>
      <kbd className="tile-key factcheck-key" aria-hidden="true">C</kbd>
    </button>
  )
}
