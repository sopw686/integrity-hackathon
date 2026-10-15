import { useEffect, useState } from 'react'
import { DOTS, GRID } from '../lib/geometry'

/**
 * The home screen's room, murmuring: dots change their minds a few at a time and one
 * vermilion dot (you) wanders through the crowd. Purely decorative; still under reduced motion.
 */
export function LivingRoom({ dot = 10, gap = 5, calm = false }: { dot?: number; gap?: number; calm?: boolean }) {
  const [cells, setCells] = useState<number[]>(() => Array.from({ length: DOTS }, (_, i) => ((i * 37) % 100 < 46 ? 1 : (i * 53) % 100 < 18 ? 2 : 0)))
  const [you, setYou] = useState(44)
  useEffect(() => {
    if (calm) return
    const id = window.setInterval(() => {
      setCells((c) => {
        const n = c.slice()
        for (let k = 0; k < 4; k++) {
          const i = Math.floor(Math.random() * DOTS)
          n[i] = Math.random() < 0.5 ? 1 : Math.random() < 0.75 ? 0 : 2
        }
        return n
      })
      if (Math.random() < 0.25) setYou((y) => Math.max(0, Math.min(DOTS - 1, y + [1, -1, GRID, -GRID][Math.floor(Math.random() * 4)])))
    }, 160)
    return () => window.clearInterval(id)
  }, [calm])
  const cell = dot + gap
  const size = GRID * cell - gap
  return (
    <svg className="living-room" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      {cells.map((k, i) => {
        const x = (i % GRID) * cell + dot / 2
        const y = Math.floor(i / GRID) * cell + dot / 2
        const isYou = i === you
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={isYou ? dot / 2 + 1 : dot / 2 - 0.5}
            className={isYou ? 'lr-you' : k === 1 ? 'lr-true' : k === 2 ? 'lr-unsure' : 'lr-false'}
            style={{ ['--d' as string]: `${(i % GRID) * 40 + Math.floor(i / GRID) * 40}ms` }}
          />
        )
      })}
    </svg>
  )
}
