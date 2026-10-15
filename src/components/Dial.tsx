/**
 * A dial: a half-circle gauge with a hairline track and an ink arc, the value in
 * 44px numerals beneath, and a condensed label with the dial's icon.
 * The two dial icons (🎯 📡) are the only emoji allowed in the chrome besides badges.
 */
export function Dial({ icon, label, value, max, display }: { icon: string; label: string; value: number; max: number; display: string }) {
  const w = 120
  const h = 64
  const r = 54
  const cx = w / 2
  const cy = 60
  const frac = Math.max(0, Math.min(1, max ? value / max : 0))
  const arc = (f: number) => {
    const a = Math.PI * (1 - f)
    return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) }
  }
  const start = arc(0)
  const end = arc(frac)
  // The gauge spans at most 180°, so the large-arc flag is always 0.
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
  return (
    <div className="dial" role="group" aria-label={`${label}: ${display}`}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--rule)" strokeWidth={1} />
        {frac > 0 && <path d={d} fill="none" stroke="var(--ink)" strokeWidth={3} strokeLinecap="butt" />}
        <line x1={cx - r} y1={cy} x2={cx - r} y2={cy - 4} stroke="var(--ink)" strokeWidth={1} />
        <line x1={cx + r} y1={cy} x2={cx + r} y2={cy - 4} stroke="var(--ink)" strokeWidth={1} />
      </svg>
      <div className="dial-value" aria-hidden="true">{display}</div>
      <div className="dial-label label" aria-hidden="true">
        <span className="dial-icon">{icon}</span> {label}
      </div>
    </div>
  )
}
