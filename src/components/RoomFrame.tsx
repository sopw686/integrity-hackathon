import { Room, type RoomProps } from './Room'
import { Stamp } from './Stamp'
import { COPY } from '../tokens/copy'
import type { Verdict } from '../lib/types'
import { REDUCED_CROSSFADE, T_STAMP } from '../tokens/motion'

function HatchSwatch() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-1px' }}>
      <defs>
        <pattern id="hatch-swatch" width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={3} height={3} fill="var(--paper)" />
          <line x1={0} y1={0} x2={0} y2={3} stroke="var(--hatch)" strokeWidth={1.2} />
        </pattern>
      </defs>
      <circle cx={6} cy={6} r={5.5} fill="url(#hatch-swatch)" stroke="var(--hatch)" strokeWidth={1} />
    </svg>
  )
}

/**
 * The room with its two header labels ("SAY TRUE" left, "SAY FALSE" right). After the
 * reveal the truth stamp lands on the correct side and the labels carry the real numbers.
 */
export function RoomFrame(
  props: RoomProps & {
    answer?: Verdict
    onTap?: () => void
    tapHint?: string
  },
) {
  const { answer, onTap, tapHint, ...room } = props
  const revealing = room.mode === 'reveal'
  const t = room.t ?? 0
  const done = t === Infinity
  const stampOn = revealing && answer !== undefined && (done || (room.reduced ? t >= REDUCED_CROSSFADE : t >= T_STAMP))
  const numbersOn = revealing && (done || t >= (room.reduced ? REDUCED_CROSSFADE : T_STAMP))

  return (
    <div className="room-wrap" style={{ width: 'fit-content' }}>
      <div className="room-head" aria-hidden="true">
        <span className="side left">
          {stampOn && answer === 'true' ? <Stamp side="true" animate={!done && !room.reduced} /> : <span className="label">{COPY.sayTrue}</span>}
          {numbersOn && <span className="label num side-num">{room.split.pctTrue}</span>}
        </span>
        <span className="side right">
          {numbersOn && <span className="label num side-num">{room.split.pctFalse}</span>}
          {stampOn && answer === 'false' ? <Stamp side="false" animate={!done && !room.reduced} /> : <span className="label">{COPY.sayFalse}</span>}
        </span>
      </div>
      {/* The header is decorative and hidden; the stamp's verdict is said here instead. */}
      {stampOn && <span className="sr-only">The claim is {answer}.</span>}
      {onTap ? (
        <button type="button" className="room-tap" onClick={onTap} aria-label={tapHint ?? 'Skip the animation'}>
          <Room {...room} />
        </button>
      ) : (
        <Room {...room} />
      )}
      {revealing && numbersOn && room.split.pctUnsure > 0 && (
        <div className="room-foot label" aria-hidden="true">
          <HatchSwatch /> {room.split.pctUnsure} {COPY.unsure.toLowerCase()}
        </div>
      )}
    </div>
  )
}
