// Confetti made of the room itself: ink dots, hollow dots, a few vermilion "you" dots and
// strips of newsprint. One shared fixed canvas, created on first burst, gone when idle.
// Never fires under reduced motion or when the test hook freezes the clock.

type P = { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; kind: number; color: string; life: number }

let canvas: HTMLCanvasElement | null = null
let raf = 0
let parts: P[] = []

function calm(): boolean {
  if (typeof window === 'undefined') return true
  if (typeof window.__RTR_FREEZE_T === 'number') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function palette(): string[] {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string, f: string) => s.getPropertyValue(n).trim() || f
  return [v('--ink', '#141414'), v('--ink', '#141414'), v('--you', '#D64A2B'), v('--pop', '#F5C542'), v('--win', '#2F8F5B')]
}

function ensureCanvas(): CanvasRenderingContext2D | null {
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.className = 'confetti-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = window.innerWidth
  const h = window.innerHeight
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
  }
  const c = canvas.getContext('2d')
  c?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return c
}

function frame() {
  const c = ensureCanvas()
  if (!c || !canvas) return
  const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim() || '#F6F3EC'
  c.clearRect(0, 0, window.innerWidth, window.innerHeight)
  parts = parts.filter((p) => p.life > 0 && p.y < window.innerHeight + 40)
  for (const p of parts) {
    p.vy += 0.32
    p.vx *= 0.985
    p.vy *= 0.985
    p.x += p.vx
    p.y += p.vy
    p.rot += p.vr
    p.life -= 1
    c.save()
    c.globalAlpha = Math.min(1, p.life / 30)
    c.translate(p.x, p.y)
    c.rotate(p.rot)
    if (p.kind === 0) {
      c.fillStyle = p.color
      c.beginPath()
      c.arc(0, 0, p.r, 0, Math.PI * 2)
      c.fill()
    } else if (p.kind === 1) {
      c.fillStyle = paper
      c.strokeStyle = p.color
      c.lineWidth = 1.5
      c.beginPath()
      c.arc(0, 0, p.r, 0, Math.PI * 2)
      c.fill()
      c.stroke()
    } else {
      // a strip of newsprint, flipping as it falls
      c.scale(1, Math.cos(p.rot * 3))
      c.fillStyle = p.color
      c.fillRect(-p.r * 1.4, -p.r * 0.45, p.r * 2.8, p.r * 0.9)
    }
    c.restore()
  }
  if (parts.length) raf = requestAnimationFrame(frame)
  else {
    canvas.remove()
    canvas = null
    raf = 0
  }
}

export type BurstOptions = {
  /** viewport origin; defaults to the centre of the given element, else the screen */
  x?: number
  y?: number
  from?: Element | null
  count?: number
  spread?: number
  power?: number
  /** rain from the top edge instead of bursting from a point */
  rain?: boolean
}

export function confetti(opts: BurstOptions = {}): void {
  if (calm() || typeof document === 'undefined') return
  const colors = palette()
  let { x, y } = opts
  if (opts.from) {
    const r = opts.from.getBoundingClientRect()
    x ??= r.left + r.width / 2
    y ??= r.top + r.height / 2
  }
  x ??= window.innerWidth / 2
  y ??= window.innerHeight / 3
  const count = opts.count ?? 60
  const spread = opts.spread ?? Math.PI * 2
  const power = opts.power ?? 11
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * spread
    const s = power * (0.45 + Math.random() * 0.75)
    parts.push({
      x: opts.rain ? Math.random() * window.innerWidth : x,
      y: opts.rain ? -20 - Math.random() * 200 : y,
      vx: opts.rain ? (Math.random() - 0.5) * 3 : Math.cos(a) * s,
      vy: opts.rain ? Math.random() * 3 : Math.sin(a) * s,
      r: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      kind: Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 110 + Math.random() * 60,
    })
  }
  if (!raf) raf = requestAnimationFrame(frame)
}
