import { m } from 'motion/react'
import { BADGES } from '../tokens/copy'
import type { BadgeId } from '../lib/types'
import { BADGE_SPRING } from '../tokens/motion'
import { BadgeArt } from './BadgeArt'

export function Badge({ id, animate = true, compact = false }: { id: BadgeId; animate?: boolean; compact?: boolean }) {
  const b = BADGES[id]
  if (compact) {
    return (
      <span className="badge compact">
        <BadgeArt id={id} size={22} />
        <span className="badge-name">{b.name}</span>
      </span>
    )
  }
  return (
    <m.div
      className={`badge badge-${id}`}
      initial={animate ? { y: 18, opacity: 0, scale: 0.9 } : false}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={BADGE_SPRING}
    >
      {/* The medallion flips in like a coin landing. */}
      <m.span
        className="badge-coin"
        initial={animate ? { rotateY: 540, scale: 0.3 } : false}
        animate={{ rotateY: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 140, damping: 13 }}
      >
        <BadgeArt id={id} size={56} />
      </m.span>
      <span className="badge-text">
        <span className="badge-name">{b.name}</span>
        <span className="badge-line">{b.line}</span>
      </span>
    </m.div>
  )
}
