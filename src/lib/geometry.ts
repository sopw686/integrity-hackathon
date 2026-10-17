// The room grid geometry. Pure functions shared by <Room /> (SVG) and the share-card canvas,
// so both draw exactly the same picture.

export const GRID = 10
export const DOTS = GRID * GRID

export type DotKind = 'true' | 'false' | 'unsure'

export type RoomSplit = { pctTrue: number; pctFalse: number; pctUnsure: number }

export type Layout = {
  cell: number      // dot diameter
  gap: number       // gap between dots
  pad: number       // outer padding (so the boundary line and pulses are not clipped)
  size: number      // total width/height
}

export function layout(cell: number, gap: number, pad = Math.max(2, gap)): Layout {
  return { cell, gap, pad, size: pad * 2 + GRID * cell + (GRID - 1) * gap }
}

export function rowOf(i: number): number {
  return Math.floor(i / GRID)
}
export function colOf(i: number): number {
  return i % GRID
}

/** Center of dot i. Reading order: left to right, top to bottom. */
export function center(i: number, L: Layout): { x: number; y: number } {
  const r = rowOf(i)
  const c = colOf(i)
  const step = L.cell + L.gap
  return { x: L.pad + c * step + L.cell / 2, y: L.pad + r * step + L.cell / 2 }
}

/**
 * Dot counts for a split. The true block is exact (the guess is scored against it) and the
 * unsure block matches the legend; a published 99/101 sum is absorbed by the false block,
 * so the open-dot count can differ from pctFalse by 1.
 */
export function roomCounts(s: RoomSplit): { t: number; f: number; u: number } {
  const t = clampCount(s.pctTrue)
  const u = Math.min(DOTS - t, clampCount(s.pctUnsure))
  return { t, f: DOTS - t - u, u }
}

/** Dots 0..t-1 say true; the next f say false; the last u are unsure (see roomCounts). */
export function dotKind(i: number, s: RoomSplit): DotKind {
  const { t, f } = roomCounts(s)
  if (i < t) return 'true'
  if (i < t + f) return 'false'
  return 'unsure'
}

export function clampCount(n: number): number {
  return Math.max(0, Math.min(DOTS, Math.round(n)))
}

/** While sliding: the first `guess` dots are shaded true, the rest false. */
export function sliderKind(i: number, guess: number): DotKind {
  return i < clampCount(guess) ? 'true' : 'false'
}

/**
 * The stepped boundary after the first n dots in reading order. Returns an SVG path
 * that wraps: a horizontal run on the row above, a vertical step, a horizontal run
 * on the row below. For n = 0 or 100 it is a single edge line.
 */
export function boundaryPath(n: number, L: Layout): string {
  const count = clampCount(n)
  const step = L.cell + L.gap
  const left = L.pad - L.gap / 2
  const right = L.pad + GRID * step - L.gap / 2
  const yLine = (row: number) => L.pad + row * step - L.gap / 2 // line just above `row`
  const xLine = (col: number) => L.pad + col * step - L.gap / 2 // line just left of `col`

  if (count === 0) return `M ${right} ${yLine(0)} L ${left} ${yLine(0)}`
  if (count === DOTS) return `M ${right} ${yLine(GRID)} L ${left} ${yLine(GRID)}`

  const r = Math.floor(count / GRID)
  const c = count % GRID
  if (c === 0) return `M ${right} ${yLine(r)} L ${left} ${yLine(r)}`

  const x = xLine(c)
  return [`M ${right} ${yLine(r)}`, `L ${x} ${yLine(r)}`, `L ${x} ${yLine(r + 1)}`, `L ${left} ${yLine(r + 1)}`].join(' ')
}

/** Approximate length of a boundary path, for stroke-dash draw-in. */
export function boundaryLength(n: number, L: Layout): number {
  const count = clampCount(n)
  const step = L.cell + L.gap
  const width = GRID * step
  if (count === 0 || count === DOTS || count % GRID === 0) return width
  return width + step
}

/**
 * Where "you" stand. Verdict true → the last dot of the true block; verdict false →
 * the first dot after the true block. If that lands in the unsure region, use the
 * nearest dot on the verdict's side. Always a valid index 0..99.
 */
// HUMAN: whether "you" should instead be a 101st dot drawn just outside the grid. Decide after watching ten reveals.
export function playerDotIndex(s: RoomSplit, verdict: 'true' | 'false'): number {
  const { t, f } = roomCounts(s)
  if (verdict === 'true') {
    if (t > 0) return t - 1
    return 0 // no one said true; you stand at the very first seat
  }
  // verdict false
  if (f > 0) return Math.min(DOTS - 1, t) // first dot of the false block
  if (t > 0) return Math.min(DOTS - 1, t) // whole rest is unsure; stand at the boundary anyway
  return 0
}

/** Row-by-row reveal: progress 0..1 → how much of row r has recolored (0..1). */
export function rowProgress(progress: number, row: number, stagger: number, fill: number): number {
  const total = stagger * (GRID - 1) + fill
  const t = progress * total
  const start = row * stagger
  return Math.max(0, Math.min(1, (t - start) / fill))
}

/** Plain-language summary for aria-label. */
export function describeRoom(s: RoomSplit, label: string): string {
  const t = Math.round(s.pctTrue)
  const f = Math.round(s.pctFalse)
  const u = Math.round(s.pctUnsure)
  const parts = [`${t} of 100 ${label} say true`, `${f} say false`]
  if (u > 0) parts.push(`${u} ${u === 1 ? 'is' : 'are'} unsure`)
  return parts.join(', ') + '.'
}
