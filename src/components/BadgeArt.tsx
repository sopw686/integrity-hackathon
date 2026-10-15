import type { BadgeId } from '../lib/types'

// HUMAN: the five medallions. Hand-drawn SVG on the palette tokens so they follow dark mode.
// Each is a coin: a colored field, an ink ring, one character.

const FIELD: Record<BadgeId, string> = {
  'good-company': 'var(--win-soft)',
  fox: 'var(--pop)',
  sheep: 'var(--rule)',
  stray: 'var(--paper)',
  split: 'var(--pop-soft)',
}

function Fox() {
  return (
    <g strokeLinejoin="round">
      <path d="M17 18 L24 32 L32 27 L40 32 L47 18 L44 38 Q32 52 20 38 Z" fill="var(--you)" stroke="var(--ink)" strokeWidth={2} />
      <path d="M20 21 L24 30 L22 28 Z M44 21 L40 30 L42 28 Z" fill="var(--ink)" />
      <path d="M22 38 Q27 40 32 47 Q37 40 42 38 Q37 44 32 49 Q27 44 22 38 Z" fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.5} />
      <path d="M25 35 q2.5 -2.4 5 0" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
      <path d="M34 35 q2.5 -2.4 5 0" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" />
      <circle cx={32} cy={46} r={2.2} fill="var(--ink)" />
    </g>
  )
}

function Sheep() {
  const puffs: Array<[number, number, number]> = [
    [22, 24, 6], [32, 19, 7], [42, 24, 6], [18, 33, 6], [46, 33, 6], [22, 42, 6], [42, 42, 6], [32, 45, 6],
  ]
  return (
    <g>
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="var(--paper)" stroke="var(--ink)" strokeWidth={1.8} />
      ))}
      <circle cx={32} cy={32} r={13} fill="var(--paper)" />
      <ellipse cx={19} cy={30} rx={5} ry={2.6} fill="var(--ink)" transform="rotate(-20 19 30)" />
      <ellipse cx={45} cy={30} rx={5} ry={2.6} fill="var(--ink)" transform="rotate(20 45 30)" />
      <rect x={42.5} y={31} width={4} height={5} rx={1} fill="var(--you)" />
      <path d="M23 28 Q32 22 41 28 L39 42 Q32 48 25 42 Z" fill="var(--ink)" />
      <circle cx={28} cy={33} r={2.6} fill="var(--paper)" />
      <circle cx={36} cy={33} r={2.6} fill="var(--paper)" />
      <circle cx={28.6} cy={33.6} r={1.2} fill="var(--ink)" />
      <circle cx={35.4} cy={33.6} r={1.2} fill="var(--ink)" />
      <path d="M29 41 q3 2 6 0" fill="none" stroke="var(--paper)" strokeWidth={1.5} strokeLinecap="round" />
    </g>
  )
}

function Company() {
  const person = (x: number, fill: string, s = 1) => (
    <g transform={`translate(${x} 0) scale(${s})`} key={x}>
      <circle cx={0} cy={26} r={5.5} fill={fill} stroke="var(--ink)" strokeWidth={1.8} />
      <path d="M-9 48 Q-9 34 0 34 Q9 34 9 48 Z" fill={fill} stroke="var(--ink)" strokeWidth={1.8} />
    </g>
  )
  return (
    <g>
      {person(16, 'var(--paper)', 0.9)}
      {person(48, 'var(--paper)', 0.9)}
      {person(32, 'var(--ink)', 1.1)}
      <path d="M38 22 l3 -6 l1.5 5" fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  )
}

function Stray() {
  return (
    <g>
      {[[16, 40], [22, 46], [16, 50], [24, 38], [10, 45]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.4} fill="var(--ink)" />
      ))}
      <circle cx={44} cy={38} r={7} fill="var(--paper)" stroke="var(--ink)" strokeWidth={2} />
      <circle cx={41.6} cy={37} r={1.2} fill="var(--ink)" />
      <circle cx={46.4} cy={37} r={1.2} fill="var(--ink)" />
      <path d="M41.5 41.5 q2.5 -1.6 5 0" fill="none" stroke="var(--ink)" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M40 22 q0 -5 4.5 -5 q4.5 0 4.5 4 q0 3 -4.5 4.5 v2.5" fill="none" stroke="var(--you)" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={44.5} cy={31} r={1.6} fill="var(--you)" />
    </g>
  )
}

function Split() {
  return (
    <g stroke="var(--ink)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 16 V46 M24 48 H40" fill="none" />
      <path d="M14 22 H50" fill="none" />
      <circle cx={32} cy={15} r={2.5} fill="var(--ink)" />
      <path d="M14 22 L9 35 M14 22 L19 35 M50 22 L45 35 M50 22 L55 35" fill="none" strokeWidth={1.3} />
      <path d="M8 35 Q14 41 20 35 Z" fill="var(--ink)" />
      <path d="M44 35 Q50 41 56 35 Z" fill="var(--paper)" />
      <circle cx={14} cy={33} r={2} fill="var(--ink)" stroke="none" />
      <circle cx={50} cy={33} r={2} fill="var(--paper)" />
    </g>
  )
}

const ART: Record<BadgeId, () => JSX.Element> = {
  'good-company': Company,
  fox: Fox,
  sheep: Sheep,
  stray: Stray,
  split: Split,
}

export function BadgeArt({ id, size = 56 }: { id: BadgeId; size?: number }) {
  const Art = ART[id]
  return (
    <svg className="badge-art" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <circle cx={32} cy={32} r={30} fill={FIELD[id]} stroke="var(--ink)" strokeWidth={2.5} />
      <circle cx={32} cy={32} r={26} fill="none" stroke="var(--ink)" strokeWidth={0.8} strokeDasharray="1.5 2.5" />
      <Art />
    </svg>
  )
}
