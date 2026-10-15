import { m } from 'motion/react'
import { STAMP_BLEED_FADE, STAMP_DURATION, STAMP_EASE, STAMP_FROM_SCALE, STAMP_ROTATION } from '../tokens/motion'
import { COPY } from '../tokens/copy'

/**
 * The truth stamp: ink, 2px rule, uppercase, rotated −3°, landing on the header of the correct side.
 * The entrance (1.18 → 1.0 with a fading 1px ink bleed) is the one shadow allowed in the product.
 */
export function Stamp({ side, animate = true }: { side: 'true' | 'false'; animate?: boolean }) {
  return (
    <m.span
      className="stamp"
      aria-label={`Stamped ${side}`}
      role="img"
      initial={animate ? { scale: STAMP_FROM_SCALE, opacity: 0, boxShadow: '0 0 0 1px var(--ink)' } : false}
      animate={{ scale: 1, opacity: 1, boxShadow: '0 0 0 0px rgba(0,0,0,0)' }}
      transition={{
        scale: { duration: STAMP_DURATION, ease: STAMP_EASE },
        opacity: { duration: STAMP_DURATION * 0.6 },
        boxShadow: { duration: STAMP_BLEED_FADE, delay: STAMP_DURATION },
      }}
      style={{ rotate: STAMP_ROTATION }}
    >
      {side === 'true' ? COPY.stampTrue : COPY.stampFalse}
    </m.span>
  )
}
