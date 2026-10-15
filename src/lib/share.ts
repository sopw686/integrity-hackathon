// The share card (PNG via <canvas>), the text fallback, and the share flow.
// The mini rooms are drawn with the same geometry functions as <Room />, so the card
// shows exactly the picture the player saw on screen.

import { DOTS, boundaryPath, center, clampCount, dotKind, layout, playerDotIndex, type Layout, type RoomSplit } from './geometry'
import type { BadgeId, Verdict } from './types'
import { BADGES, COPY } from '../tokens/copy'

export type ShareRow = { split: RoomSplit; guess: number; verdict: Verdict }
export type ShareInput = { puzzleNumber: number; accuracy: number; read: number; badges: BadgeId[]; rows: ShareRow[] }
export type ShareOutcome = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed'

export type CardColors = { paper: string; ink: string; rule: string; muted: string; hatch: string; you: string }

/** The 2D context the drawing helpers draw into (tests can pass a mock cast to this). */
type Ctx = CanvasRenderingContext2D

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD = 1080
const SCALE = 2 // fixed devicePixelRatio for the export: 2160 × 2160 backing store
const M = 72 // margin / grid unit

const LIGHT: CardColors = {
  paper: '#F6F3EC',
  ink: '#141414',
  rule: '#D9D3C5',
  muted: '#6B655B',
  hatch: '#C9C2B2',
  you: '#D64A2B',
}

const FALLBACK_FONTS = {
  serif: "'Newsreader', 'Source Serif 4', Georgia, 'Times New Roman', serif",
  sans: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  cond: "'Archivo Narrow', 'Arial Narrow', 'Archivo', 'Helvetica Neue', sans-serif",
}
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"

const LABEL_TRACKING = 0.08 // em, matches --ls-label

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

export function shareText(input: ShareInput): string {
  const badgesLine = input.badges.map((id) => BADGES[id]?.emoji ?? '').filter(Boolean).join(' ')
  return COPY.shareText(input.puzzleNumber, input.accuracy, Math.round(input.read), badgesLine)
}

export function shareUrl(): string {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin !== 'null') {
      return `${window.location.origin}/`
    }
  } catch {
    /* ignore */
  }
  return ''
}

function hostname(): string {
  try {
    if (typeof window !== 'undefined' && window.location) return window.location.host
  } catch {
    /* ignore */
  }
  return ''
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function cssVar(style: CSSStyleDeclaration | null, name: string): string {
  if (!style) return ''
  try {
    return style.getPropertyValue(name).trim()
  } catch {
    return ''
  }
}

function rootStyle(): CSSStyleDeclaration | null {
  try {
    if (typeof document === 'undefined' || typeof getComputedStyle !== 'function') return null
    return getComputedStyle(document.documentElement)
  } catch {
    return null
  }
}

/** Colors read at call time from the live CSS custom properties, falling back to the light palette. */
export function readColors(): CardColors {
  const s = rootStyle()
  return {
    paper: cssVar(s, '--paper') || LIGHT.paper,
    ink: cssVar(s, '--ink') || LIGHT.ink,
    rule: cssVar(s, '--rule') || LIGHT.rule,
    muted: cssVar(s, '--muted') || LIGHT.muted,
    hatch: cssVar(s, '--hatch') || LIGHT.hatch,
    you: cssVar(s, '--you') || LIGHT.you,
  }
}

function readFonts(): { serif: string; sans: string; cond: string } {
  const s = rootStyle()
  return {
    serif: cssVar(s, '--font-serif') || FALLBACK_FONTS.serif,
    sans: cssVar(s, '--font-sans') || FALLBACK_FONTS.sans,
    cond: cssVar(s, '--font-cond') || FALLBACK_FONTS.cond,
  }
}

async function loadFonts(): Promise<void> {
  try {
    if (typeof document === 'undefined' || !document.fonts || typeof document.fonts.load !== 'function') return
    const loads = Promise.all([
      document.fonts.load('500 64px Newsreader').catch(() => []),
      document.fonts.load('600 28px "Archivo Narrow"').catch(() => []),
      document.fonts.load('500 96px Archivo').catch(() => []),
    ])
    // Never let a stalled font request hold the share button hostage.
    await Promise.race([loads, new Promise<void>((resolve) => setTimeout(resolve, 2000))])
  } catch {
    /* proceed with fallbacks */
  }
}

// ---------------------------------------------------------------------------
// Spaced (tracked) uppercase text — drawn per grapheme so it works without ctx.letterSpacing.
// ---------------------------------------------------------------------------

function graphemes(text: string): string[] {
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), (s) => s.segment)
    }
  } catch {
    /* fall through */
  }
  return Array.from(text)
}

function spacedWidth(ctx: Ctx, chars: string[], tracking: number): number {
  let w = 0
  for (const c of chars) w += ctx.measureText(c).width
  return w + tracking * Math.max(0, chars.length - 1)
}

function drawSpaced(ctx: Ctx, text: string, x: number, y: number, tracking: number, align: 'left' | 'center' | 'right'): void {
  const chars = graphemes(text)
  const total = spacedWidth(ctx, chars, tracking)
  let cx = align === 'left' ? x : align === 'center' ? x - total / 2 : x - total
  ctx.textAlign = 'left'
  for (const c of chars) {
    ctx.fillText(c, cx, y)
    cx += ctx.measureText(c).width + tracking
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers (exported for unit tests)
// ---------------------------------------------------------------------------

function tracePath(ctx: Ctx, d: string): Path2D | null {
  if (typeof Path2D !== 'undefined') {
    try {
      return new Path2D(d)
    } catch {
      /* fall through to manual parse */
    }
  }
  // boundaryPath only emits absolute M / L commands.
  ctx.beginPath()
  const re = /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    const x = Number(m[2])
    const y = Number(m[3])
    if (m[1] === 'M') ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  return null
}

function hatchDot(ctx: Ctx, x: number, y: number, r: number, colors: CardColors): void {
  // Matches <Room />: paper fill, 45° hatch lines 3px apart, 1px ring in --hatch.
  const spacing = 3
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = colors.paper
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.strokeStyle = colors.hatch
  ctx.lineWidth = 1.2
  ctx.beginPath()
  // Lines x + y = k·spacing, aligned to the room's own origin so the hatch reads as one fabric.
  const lo = Math.ceil((x + y - 2 * r - 2) / spacing)
  const hi = Math.floor((x + y + 2 * r + 2) / spacing)
  const y0 = y - r - 1
  const y1 = y + r + 1
  for (let k = lo; k <= hi; k++) {
    const s = k * spacing
    ctx.moveTo(s - y0, y0)
    ctx.lineTo(s - y1, y1)
  }
  ctx.stroke()
  ctx.restore()

  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.strokeStyle = colors.hatch
  ctx.lineWidth = 1
  ctx.stroke()
}

/**
 * One fully revealed mini room. (x, y) is the top-left of the geometry layout box
 * (which includes `layout().pad`), so the box is `layout(dot, gap).size` square.
 */
export function drawMiniRoom(ctx: Ctx, x: number, y: number, row: ShareRow, dot: number, gap: number, colors: CardColors): void {
  const L: Layout = layout(dot, gap)
  const r = L.cell / 2
  ctx.save()
  ctx.translate(x, y)

  for (let i = 0; i < DOTS; i++) {
    const { x: cx, y: cy } = center(i, L)
    const kind = dotKind(i, row.split)
    if (kind === 'true') {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = colors.ink
      ctx.fill()
    } else if (kind === 'false') {
      ctx.beginPath()
      ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2)
      ctx.fillStyle = colors.paper
      ctx.fill()
      ctx.strokeStyle = colors.ink
      ctx.lineWidth = 1
      ctx.stroke()
    } else {
      hatchDot(ctx, cx, cy, r - 0.5, colors)
    }
  }

  // The player's read of the room: a 1px vermilion stepped line.
  const d = boundaryPath(clampCount(row.guess), L)
  ctx.strokeStyle = colors.you
  ctx.lineWidth = 1
  ctx.lineJoin = 'miter'
  ctx.lineCap = 'butt'
  const p = tracePath(ctx, d)
  if (p) ctx.stroke(p)
  else ctx.stroke()

  // You. Drawn 1.25× so it still reads at mini size.
  // HUMAN: the 1.25× player-dot scale on the card.
  const you = center(playerDotIndex(row.split, row.verdict), L)
  ctx.beginPath()
  ctx.arc(you.x, you.y, r * 1.25, 0, Math.PI * 2)
  ctx.fillStyle = colors.you
  ctx.fill()

  ctx.restore()
}

/**
 * A half-circle gauge centered in the column [x, x + w], arc top at y.
 * Hairline track in --rule, a 6px ink arc for `frac`, the value in Archivo 500 beneath,
 * and a condensed tracked uppercase label (with its icon) under that.
 */
export function drawDial(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  frac: number,
  valueText: string,
  labelText: string,
  colors: CardColors,
  fonts: { sans: string; cond: string } = FALLBACK_FONTS,
): void {
  const f = Number.isFinite(frac) ? Math.max(0, Math.min(1, frac)) : 0
  // HUMAN: dial radius and the vertical rhythm under it (value 96px, label 26px).
  const r = Math.min(150, w / 2 - 6)
  const cx = x + w / 2
  const cy = y + 3 + r

  ctx.save()
  ctx.lineCap = 'butt'

  // Track
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, Math.PI * 2, false)
  ctx.strokeStyle = colors.rule
  ctx.lineWidth = 1
  ctx.stroke()

  // Value arc
  if (f > 0) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, Math.PI + f * Math.PI, false)
    ctx.strokeStyle = colors.ink
    ctx.lineWidth = 6
    ctx.stroke()
  }

  // End ticks, as on the on-screen dial.
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx - r, cy - 10)
  ctx.moveTo(cx + r, cy)
  ctx.lineTo(cx + r, cy - 10)
  ctx.strokeStyle = colors.ink
  ctx.lineWidth = 1
  ctx.stroke()

  // Value
  ctx.fillStyle = colors.ink
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.font = `500 96px ${fonts.sans}`
  const valueBaseline = cy + 96
  ctx.fillText(valueText, cx, valueBaseline)

  // Label
  ctx.fillStyle = colors.muted
  ctx.font = `600 26px ${fonts.cond}`
  drawSpaced(ctx, labelText.toUpperCase(), cx, valueBaseline + 56, 26 * LABEL_TRACKING, 'center')

  ctx.restore()
}

function hairline(ctx: Ctx, y: number, colors: CardColors): void {
  ctx.beginPath()
  ctx.moveTo(M, y)
  ctx.lineTo(CARD - M, y)
  ctx.strokeStyle = colors.rule
  ctx.lineWidth = 1
  ctx.stroke()
}

// ---------------------------------------------------------------------------
// The card
// ---------------------------------------------------------------------------

function drawCard(ctx: Ctx, input: ShareInput, colors: CardColors): void {
  const fonts = readFonts()

  // Paper. No gradients, no shadows, no rounded corners.
  ctx.fillStyle = colors.paper
  ctx.fillRect(0, 0, CARD, CARD)
  ctx.textBaseline = 'alphabetic'

  // Masthead: wordmark left, folio right, same baseline, hairline under.
  const mastBaseline = 128
  ctx.fillStyle = colors.ink
  ctx.textAlign = 'left'
  ctx.font = `500 64px ${fonts.serif}`
  ctx.fillText(COPY.wordmark, M, mastBaseline)
  ctx.font = `600 28px ${fonts.cond}`
  drawSpaced(ctx, `No. ${input.puzzleNumber}`.toUpperCase(), CARD - M, mastBaseline, 28 * LABEL_TRACKING, 'right')
  hairline(ctx, 160, colors)

  // Dials: two columns on the margin grid.
  const colW = (CARD - 2 * M) / 2
  const dialTop = 232
  const acc = Math.max(0, Math.min(5, Math.round(input.accuracy)))
  const read = Math.max(0, Math.min(100, Math.round(input.read)))
  drawDial(ctx, M, dialTop, colW, acc / 5, `${acc}/5`, `🎯 ${COPY.accuracy}`, colors, fonts)
  drawDial(ctx, M + colW, dialTop, colW, read / 100, `${read}`, `📡 ${COPY.read}`, colors, fonts)
  hairline(ctx, 602, colors)

  // Five mini rooms in one row. The outer dots of the first and last rooms sit on the margins.
  // HUMAN: mini grid size (12px dots, 4px gaps → 156px of dots per room) and the badge row below.
  const dot = 12
  const gap = 4
  const L = layout(dot, gap)
  const visible = L.size - 2 * L.pad
  const rows = input.rows.slice(0, 5)
  const n = Math.max(1, rows.length)
  const spacing = n > 1 ? (CARD - 2 * M - n * visible) / (n - 1) : 0
  const gridTop = 674 // dots start here
  const startX = n > 1 ? M : (CARD - visible) / 2
  rows.forEach((row, i) => {
    const vx = startX + i * (visible + spacing)
    drawMiniRoom(ctx, vx - L.pad, gridTop - L.pad, row, dot, gap, colors)
    const badge = input.badges[i]
    const emoji = badge ? BADGES[badge]?.emoji : undefined
    if (emoji) {
      ctx.font = `36px ${EMOJI_FONT}`
      ctx.textAlign = 'center'
      ctx.fillStyle = colors.ink
      ctx.fillText(emoji, vx + visible / 2, gridTop + visible + 64)
    }
  })

  // Foot: the hostname, nothing else.
  const host = hostname()
  if (host) {
    ctx.fillStyle = colors.muted
    ctx.font = `600 22px ${fonts.cond}`
    drawSpaced(ctx, host.toUpperCase(), M, CARD - M, 22 * LABEL_TRACKING, 'left')
  }
}

export async function renderShareCard(input: ShareInput): Promise<Blob> {
  if (typeof document === 'undefined') throw new Error('No document')
  await loadFonts()
  const colors = readColors()
  const canvas = document.createElement('canvas')
  canvas.width = CARD * SCALE
  canvas.height = CARD * SCALE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.scale(SCALE, SCALE)
  drawCard(ctx, input, colors)
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/png')
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

// ---------------------------------------------------------------------------
// Share flow
// ---------------------------------------------------------------------------

function isAbort(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'name' in e && (e as { name: unknown }).name === 'AbortError'
}

function download(blob: Blob, filename: string): boolean {
  try {
    if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Revoke on the next tick: revoking synchronously can cancel the download in Firefox.
    setTimeout(() => {
      try {
        URL.revokeObjectURL(href)
      } catch {
        /* ignore */
      }
    }, 1000)
    return true
  } catch {
    return false
  }
}

export async function shareResults(input: ShareInput): Promise<ShareOutcome> {
  try {
    // The copied text is exactly the two-line fallback. The site URL travels in the
    // Web Share `url` field, not in the text. HUMAN: whether to append the URL to the text too.
    const url = shareUrl()
    const text = shareText(input)
    const title = COPY.wordmark
    const filename = `read-the-room-${input.puzzleNumber}.png`

    let blob: Blob | null = null
    try {
      blob = await renderShareCard(input)
    } catch {
      blob = null
    }

    let file: File | null = null
    if (blob && typeof File === 'function') {
      try {
        file = new File([blob], filename, { type: 'image/png' })
      } catch {
        file = null
      }
    }

    const nav: Navigator | null = typeof navigator !== 'undefined' ? navigator : null
    const canWebShare = !!nav && typeof nav.share === 'function'

    // 1. Native share with the image.
    if (canWebShare && nav && file) {
      let canFiles = false
      try {
        canFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [file] })
      } catch {
        canFiles = false
      }
      if (canFiles) {
        try {
          await nav.share(url ? { files: [file], text, title, url } : { files: [file], text, title })
          return 'shared'
        } catch (e) {
          if (isAbort(e)) return 'cancelled'
        }
      }
    }

    // 2. Native share, text only.
    if (canWebShare && nav) {
      try {
        await nav.share(url ? { text, title, url } : { text, title })
        return 'shared'
      } catch (e) {
        if (isAbort(e)) return 'cancelled'
      }
    }

    // 3. Desktop: copy the text, download the card.
    let copied = false
    try {
      if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
        await nav.clipboard.writeText(text)
        copied = true
      }
    } catch {
      copied = false
    }
    const downloaded = blob ? download(blob, filename) : false
    if (downloaded) return 'downloaded'
    if (copied) return 'copied'
    return 'failed'
  } catch {
    return 'failed'
  }
}
