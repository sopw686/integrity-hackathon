import { useCountUp } from '../lib/hooks'

/**
 * A dial: a half-circle gauge with a hairline track and an ink arc, the value in
 * 44px numerals beneath, and a condensed label with the dial's icon.
 * The two dial icons (🎯 📡) are the only emoji allowed in the chrome besides badges.
 * With `animate`, the arc sweeps up and the number counts up to the value.
 */
export function Dial({
  icon,
  label,
  value,
  max,
  display,
  animate = false,
  delay = 0,
}: {
  icon: string
  label: string
  value: number
  max: number
  display: string
  animate?: boolean
  delay?: number
}) {
  const shown = useCountUp(value, 1100, animate, delay)
  const w = 120
  const h = 64
  const r = 54
  const cx = w / 2
  const cy = 60
  const frac = Math.max(0, Math.min(1, max ? shown / max : 0))
  const arc = (f: number) => {
    const a = Math.PI * (1 - f)
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }
  const start = arc(0)
  const end = arc(frac)
  // The gauge spans at most 180°, so the large-arc flag is always 0.
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
  const full = shown >= max && max > 0
  return (
    <div className={`dial${full ? ' full' : ''}`} role="img" aria-label={`${label}: ${display}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--rule)" strokeWidth={6} strokeLinecap="round" />
        {frac > 0 && <path d={d} fill="none" stroke={full ? 'var(--win)' : 'var(--ink)'} strokeWidth={6} strokeLinecap="round" />}
        {frac > 0 && <circle cx={end.x} cy={end.y} r={6} fill="var(--you)" stroke="var(--paper)" strokeWidth={2} />}
      </svg>
      <div className="dial-value num" aria-hidden="true">{animate && shown !== value ? display.replace(String(value), String(shown)) : display}</div>
      <div className="dial-label label" aria-hidden="true">
        <span className="dial-icon">{icon}</span> {label}
      </div>
    </div>
  )
}
