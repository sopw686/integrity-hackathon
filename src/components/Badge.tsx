import { m } from 'motion/react'
import { BADGES } from '../tokens/copy'
import type { BadgeId } from '../lib/types'
import { BADGE_DROP_PX, BADGE_SPRING } from '../tokens/motion'

export function Badge({ id, animate = true, compact = false }: { id: BadgeId; animate?: boolean; compact?: boolean }) {
  const b = BADGES[id]
  if (compact) {
    return (
      <span className="badge compact">
        <span className="badge-emoji" aria-hidden="true">{b.emoji}</span>
        <span className="badge-name">{b.name}</span>
      </span>
    )
  }
  return (
    <m.div
      className="badge"
      initial={animate ? { y: -BADGE_DROP_PX, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={BADGE_SPRING}
    >
      <span className="badge-emoji" aria-hidden="true">{b.emoji}</span>
      <span className="badge-text">
        <span className="badge-name">{b.name}</span>
        <span className="badge-line">{b.line}</span>
      </span>
    </m.div>
  )
}
