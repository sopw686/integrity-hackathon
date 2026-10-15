// HUMAN: every sound below. They are synthesized (no audio files, nothing to download), so
// pitch, length and loudness are numbers you can tune by ear. Haptics ride the same switch.
import { useSyncExternalStore } from 'react'

const KEY = 'read-the-room:sound'
const listeners = new Set<() => void>()

function readPref(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

let enabled = typeof window !== 'undefined' ? readPref() : false

export function soundOn(): boolean {
  return enabled
}

export function setSound(on: boolean): void {
  enabled = on
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* storage off: the switch still works for this visit */
  }
  listeners.forEach((l) => l())
  if (on) sfx.tap()
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => enabled,
    () => false,
  )
}

let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { ac: AudioContext; out: GainNode } | null {
  if (!enabled || typeof window === 'undefined') return null
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.32
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return { ac: ctx, out: master! }
  } catch {
    return null
  }
}

type Tone = {
  freq: number
  to?: number
  dur: number
  type?: OscillatorType
  vol?: number
  delay?: number
  attack?: number
}

function tone({ freq, to, dur, type = 'sine', vol = 0.5, delay = 0, attack = 0.005 }: Tone) {
  const a = audio()
  if (!a) return
  const { ac, out } = a
  const t0 = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(out)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise({ dur, vol = 0.3, delay = 0, from = 800, to = 200, q = 1 }: { dur: number; vol?: number; delay?: number; from?: number; to?: number; q?: number }) {
  const a = audio()
  if (!a) return
  const { ac, out } = a
  const t0 = ac.currentTime + delay
  const len = Math.max(1, Math.floor(ac.sampleRate * dur))
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  const src = ac.createBufferSource()
  src.buffer = buf
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(from, t0)
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  const g = ac.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f).connect(g).connect(out)
  src.start(t0)
}

function buzz(pattern: number | number[]) {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* no haptics here */
  }
}

// A major pentatonic, so any run of notes sounds like it belongs together.
const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]
const note = (base: number, step: number) => base * Math.pow(2, PENTA[Math.max(0, Math.min(PENTA.length - 1, step))] / 12)

let lastTick = 0
let lastTickValue = -1

export const sfx = {
  tap() {
    tone({ freq: 880, to: 660, dur: 0.06, type: 'triangle', vol: 0.25 })
    buzz(8)
  },
  verdict(v: 'true' | 'false') {
    if (v === 'true') {
      tone({ freq: 523, dur: 0.09, type: 'triangle', vol: 0.4 })
      tone({ freq: 784, dur: 0.14, type: 'triangle', vol: 0.4, delay: 0.07 })
    } else {
      tone({ freq: 659, dur: 0.09, type: 'triangle', vol: 0.4 })
      tone({ freq: 440, dur: 0.14, type: 'triangle', vol: 0.4, delay: 0.07 })
    }
    noise({ dur: 0.18, vol: 0.12, from: 400, to: 2400, q: 0.7 })
    buzz(14)
  },
  /** The slider: a soft click whose pitch climbs with the share. Throttled. */
  slide(value: number) {
    const now = performance.now()
    if (value === lastTickValue || now - lastTick < 28) return
    const crossedRow = lastTickValue >= 0 && Math.floor(value / 10) !== Math.floor(lastTickValue / 10)
    lastTick = now
    lastTickValue = value
    tone({ freq: 220 + value * 7, dur: 0.035, type: 'square', vol: crossedRow ? 0.09 : 0.045 })
    if (crossedRow) buzz(6)
  },
  lock() {
    tone({ freq: 196, to: 98, dur: 0.16, type: 'square', vol: 0.22 })
    noise({ dur: 0.08, vol: 0.25, from: 2000, to: 600, q: 2 })
    buzz([18, 30, 10])
  },
  /** One per recoloring row: an ascending run, like a drumroll climbing to the stamp. */
  row(r: number) {
    tone({ freq: note(392, r), dur: 0.07, type: 'triangle', vol: 0.18 })
  },
  stamp() {
    tone({ freq: 150, to: 45, dur: 0.28, type: 'sine', vol: 0.9 })
    noise({ dur: 0.12, vol: 0.5, from: 1200, to: 200, q: 0.8 })
    buzz(40)
  },
  correct() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.35, delay: i * 0.07 }))
    buzz([20, 40, 20])
  },
  wrong() {
    tone({ freq: 233, to: 175, dur: 0.22, type: 'sawtooth', vol: 0.12 })
    tone({ freq: 185, to: 139, dur: 0.3, type: 'sawtooth', vol: 0.12, delay: 0.16 })
    buzz([60, 40, 60])
  },
  bullseye() {
    ;[1319, 1568, 1976, 2637].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'sine', vol: 0.22, delay: 0.05 + i * 0.05 }))
  },
  points() {
    tone({ freq: 988, dur: 0.06, type: 'square', vol: 0.08 })
    tone({ freq: 1319, dur: 0.12, type: 'square', vol: 0.08, delay: 0.06 })
  },
  badge() {
    noise({ dur: 0.25, vol: 0.12, from: 600, to: 4000, q: 0.6 })
    tone({ freq: 1568, dur: 0.18, type: 'sine', vol: 0.18, delay: 0.12 })
  },
  whoosh() {
    noise({ dur: 0.22, vol: 0.16, from: 300, to: 3000, q: 0.6 })
  },
  count(n: number) {
    tone({ freq: n > 0 ? 587 : 1175, dur: n > 0 ? 0.12 : 0.32, type: 'square', vol: 0.12 })
    buzz(n > 0 ? 10 : 30)
  },
  fanfare() {
    const seq: Array<[number, number, number]> = [
      [523, 0, 0.12],
      [659, 0.12, 0.12],
      [784, 0.24, 0.12],
      [1047, 0.36, 0.42],
      [784, 0.36, 0.42],
    ]
    seq.forEach(([f, d, l]) => tone({ freq: f, dur: l, type: 'triangle', vol: 0.3, delay: d }))
    noise({ dur: 0.5, vol: 0.08, from: 3000, to: 8000, q: 0.5, delay: 0.36 })
    buzz([30, 60, 30, 60, 80])
  },
}
