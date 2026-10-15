import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { REDUCED_T_DONE, T_DONE } from '../tokens/motion'
import { todayKey } from './day'

declare global {
  interface Window {
    /** test hook: fixes "today" (YYYY-MM-DD) so screenshots are stable */
    __RTR_TODAY?: string
    /** test hook: freezes the reveal clock at this many seconds (Infinity = finished) */
    __RTR_FREEZE_T?: number
  }
}

/** 14px dots on phones, 18px from 720px up. */
export function useDotSize(): number {
  const get = () => (typeof window !== 'undefined' && window.matchMedia('(min-width: 720px)').matches ? 18 : 14)
  const [dot, setDot] = useState(get)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 720px)')
    const on = () => setDot(get())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dot
}

export function useToday(): string {
  const [today, setToday] = useState(() => window.__RTR_TODAY ?? todayKey())
  useEffect(() => {
    // Re-check on focus so a tab left open overnight rolls to the new puzzle.
    const on = () => setToday(window.__RTR_TODAY ?? todayKey())
    window.addEventListener('focus', on)
    document.addEventListener('visibilitychange', on)
    return () => {
      window.removeEventListener('focus', on)
      document.removeEventListener('visibilitychange', on)
    }
  }, [])
  return today
}

export function useReduced(): boolean {
  return useReducedMotion() ?? false
}

/**
 * The reveal clock. Starts when `active` turns true; `t` is seconds since then.
 * Finishes at T_DONE (or the reduced-motion cut), after which t is Infinity and the
 * grid is still. `skip()` jumps straight to the end (archive tap-to-skip).
 */
export function useRevealClock(active: boolean, reduced: boolean): { t: number; done: boolean; skip: () => void } {
  const [t, setT] = useState(0)
  const start = useRef<number | null>(null)
  const raf = useRef(0)
  const end = reduced ? REDUCED_T_DONE : T_DONE

  useEffect(() => {
    if (!active) {
      start.current = null
      setT(0)
      return
    }
    const frozen = window.__RTR_FREEZE_T
    if (typeof frozen === 'number') {
      setT(frozen >= end ? Infinity : frozen)
      return
    }
    start.current = performance.now()
    const tick = (now: number) => {
      const s = (now - (start.current ?? now)) / 1000
      if (s >= end) {
        setT(Infinity)
        return
      }
      setT(s)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [active, end])

  const skip = useCallback(() => {
    cancelAnimationFrame(raf.current)
    setT(Infinity)
  }, [])

  return { t, done: t === Infinity, skip }
}

/** Set the document title per screen. */
export function useTitle(title: string) {
  useEffect(() => {
    const prev = document.title
    document.title = title
    return () => {
      document.title = prev
    }
  }, [title])
}
