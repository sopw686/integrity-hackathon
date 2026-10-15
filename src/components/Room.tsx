import { memo, useId, useMemo } from 'react'
import { m } from 'motion/react'
import {
  DOTS,
  GRID,
  boundaryLength,
  boundaryPath,
  center,
  clampCount,
  describeRoom,
  dotKind,
  layout,
  playerDotIndex,
  rowOf,
  rowProgress,
  sliderKind,
  type DotKind,
  type RoomSplit,
} from '../lib/geometry'
import type { Verdict } from '../lib/types'
import {
  DOT_PULSE,
  DOT_PULSES,
  DOT_PULSE_SCALE,
  GUESS_DRAW,
  REDUCED_CROSSFADE,
  ROW_FILL,
  ROW_STAGGER,
  T_DOT,
  T_GRID_END,
  T_GUESS,
} from '../tokens/motion'

/**
 * The room: 10 × 10 dots, one per percent of a real polled public.
 *
 * Pure. Everything it draws is a function of its props:
 *  - mode 'slider': dots shade from the left as `guess` moves (no transitions).
 *  - mode 'reveal': `t` is seconds since the reveal began; rows recolor from the
 *    slider state into the real split, then the guess line draws, then your dot pulses.
 *    Pass t = Infinity for a finished reveal (archive, deep link, results rows).
 * Geometry comes from lib/geometry so the share-card canvas draws the identical picture.
 */
export type RoomProps = {
  split: RoomSplit
  label: string
  mode: 'slider' | 'reveal'
  guess?: number
  verdict?: Verdict
  /** seconds since reveal start; Infinity = fully revealed and still */
  t?: number
  /** honor prefers-reduced-motion: one crossfade, no pulses */
  reduced?: boolean
  /** dot diameter in px (14 mobile, 18 desktop, small for minis) */
  dot?: number
  gap?: number
  /** Phase 2: ghost line for "players so far today" (0..100). Rendered only when provided. */
  overlay?: number
  className?: string
}

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3)

function Dot({ i, kind, L, hatchId }: { i: number; kind: DotKind; L: ReturnType<typeof layout>; hatchId: string }) {
  const { x, y } = center(i, L)
  const r = L.cell / 2
  if (kind === 'true') return <circle cx={x} cy={y} r={r} fill="var(--ink)" />
  if (kind === 'false') return <circle cx={x} cy={y} r={r - 0.5} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1} />
  return <circle cx={x} cy={y} r={r - 0.5} fill={`url(#${hatchId})`} stroke="var(--hatch)" strokeWidth={1} />
}

export const Room = memo(function Room({
  split,
  label,
  mode,
  guess,
  verdict,
  t = 0,
  reduced = false,
  dot = 14,
  gap = 6,
  overlay,
  className,
}: RoomProps) {
  const uid = useId().replace(/:/g, '')
  const hatchId = `hatch-${uid}`
  const L = useMemo(() => layout(dot, gap), [dot, gap])

  const revealing = mode === 'reveal'
  const gridProgress = revealing ? (reduced ? Math.min(1, t / REDUCED_CROSSFADE) : Math.min(1, t / T_GRID_END)) : 0
  const done = revealing && t === Infinity
  const guessCount = guess === undefined ? undefined : clampCount(guess)

  // The state the grid starts from: the player's shading if they guessed, else an empty room.
  const before = (i: number): DotKind => (guessCount === undefined ? 'false' : sliderKind(i, guessCount))

  const dots = []
  for (let i = 0; i < DOTS; i++) {
    const b = before(i)
    if (!revealing) {
      dots.push(<Dot key={i} i={i} kind={b} L={L} hatchId={hatchId} />)
      continue
    }
    const a = dotKind(i, split)
    if (a === b || done) {
      dots.push(<Dot key={i} i={i} kind={a} L={L} hatchId={hatchId} />)
      continue
    }
    const p = reduced ? gridProgress : easeOut(rowProgress(gridProgress, rowOf(i), ROW_STAGGER, ROW_FILL))
    if (p >= 1) {
      dots.push(<Dot key={i} i={i} kind={a} L={L} hatchId={hatchId} />)
    } else if (p <= 0) {
      dots.push(<Dot key={i} i={i} kind={b} L={L} hatchId={hatchId} />)
    } else {
      // Each dot swells as it flips, so the rows "pop" over like a stadium wave.
      const { x, y } = center(i, L)
      const s = reduced ? 1 : 1 + 0.45 * Math.sin(Math.PI * p)
      dots.push(
        <g key={i} transform={s === 1 ? undefined : `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`}>
          <Dot i={i} kind={a} L={L} hatchId={hatchId} />
          <g opacity={1 - p}>
            <Dot i={i} kind={b} L={L} hatchId={hatchId} />
          </g>
        </g>,
      )
    }
  }

  const showGuess = revealing && guessCount !== undefined && (done || (reduced ? t >= REDUCED_CROSSFADE : t >= T_GUESS))
  const showYou = revealing && verdict !== undefined && (done || (reduced ? t >= REDUCED_CROSSFADE : t >= T_DOT))
  const animateIn = !done && !reduced

  const youIndex = verdict ? playerDotIndex(split, verdict) : -1
  const you = youIndex >= 0 ? center(youIndex, L) : null
  const r = L.cell / 2

  const aria = revealing
    ? describeRoom(split, label) + (verdict ? ` Your dot stands with those who said ${verdict}.` : '')
    : guessCount === undefined
      ? `The room: 100 ${label}. Move the slider to shade how many say true.`
      : `Your guess: ${guessCount} of 100 ${label} say true.`

  return (
    <svg
      className={[className, mode === 'slider' ? 'room-live' : ''].filter(Boolean).join(' ') || undefined}
      width={L.size}
      height={L.size}
      viewBox={`0 0 ${L.size} ${L.size}`}
      role="img"
      aria-label={aria}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        {/* The uncertain part of the public literally looks foggy: a 45° hatch. */}
        <pattern id={hatchId} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={3} height={3} fill="var(--paper)" />
          <line x1={0} y1={0} x2={0} y2={3} stroke="var(--hatch)" strokeWidth={1.2} />
        </pattern>
      </defs>
      <g>{dots}</g>
      {overlay !== undefined && (
        <path d={boundaryPath(overlay, L)} fill="none" stroke="var(--muted)" strokeWidth={1} strokeDasharray="2 3" opacity={0.9} />
      )}
      {showGuess && guessCount !== undefined && (
        <m.path
          key="guess"
          d={boundaryPath(guessCount, L)}
          fill="none"
          stroke="var(--you)"
          strokeWidth={1}
          strokeLinejoin="miter"
          strokeDasharray={boundaryLength(guessCount, L)}
          initial={animateIn ? { strokeDashoffset: boundaryLength(guessCount, L) } : false}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: GUESS_DRAW, ease: 'easeOut' }}
        />
      )}
      {showYou && you && (
        <m.circle
          key="you"
          cx={you.x}
          cy={you.y}
          fill="var(--you)"
          initial={animateIn ? { r } : false}
          animate={animateIn ? { r: Array.from({ length: DOT_PULSES }, () => [r, r * DOT_PULSE_SCALE, r]).flat() } : { r }}
          transition={{ duration: DOT_PULSE * DOT_PULSES, ease: 'easeInOut', times: undefined }}
        />
      )}
    </svg>
  )
})

/** Convenience for results rows, the share card preview and the archive: a tiny, still, fully revealed room. */
export function MiniRoom({ split, label, guess, verdict, dot = 4, gap = 2 }: Omit<RoomProps, 'mode' | 't'>) {
  return <Room split={split} label={label} mode="reveal" t={Infinity} guess={guess} verdict={verdict} dot={dot} gap={gap} />
}

export const ROOM_ROWS = GRID
