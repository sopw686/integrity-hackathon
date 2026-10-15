// HUMAN: every timing below. Tune the row cadence and the stamp overshoot by feel on a real phone.
// All durations in seconds (Motion's unit). The reveal sequence is one orchestrated moment.

export const ROW_STAGGER = 0.07        // 10 rows, 70ms apart
export const ROW_FILL = 0.16           // each row's dots transition fill over 160ms
export const ROW_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1] // ease-out

export const STAMP_DURATION = 0.22
export const STAMP_FROM_SCALE = 1.18
export const STAMP_ROTATION = -3       // degrees
export const STAMP_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1] // slight overshoot
export const STAMP_BLEED_FADE = 0.5    // the one shadow allowed: a 1px ink bleed that fades

export const GUESS_DRAW = 0.24         // stroke-dashoffset draw-in

export const DOT_PULSE = 0.3           // each pulse 1.0 → 1.35 → 1.0
export const DOT_PULSE_SCALE = 1.35
export const DOT_PULSES = 2

export const BADGE_DROP_PX = 8
export const BADGE_SPRING = { type: 'spring' as const, stiffness: 500, damping: 30 }

export const SOURCE_FADE = 0.2
export const REDUCED_CROSSFADE = 0.2   // reduced-motion: the grid crossfades once instead of row by row

// Derived timeline (seconds from reveal start). Kept here so screens and the
// read-only claim page agree on when "Next" may appear.
export const T_GRID_END = ROW_STAGGER * 9 + ROW_FILL          // ≈ 0.79
export const T_STAMP = T_GRID_END + 0.02                        // ≈ 0.81
export const T_GUESS = T_STAMP + STAMP_DURATION                 // ≈ 1.03
export const T_DOT = T_GUESS + GUESS_DRAW                       // ≈ 1.27
export const T_BADGE = T_DOT + DOT_PULSE * DOT_PULSES           // ≈ 1.87
export const T_SOURCE = T_BADGE + 0.22                          // ≈ 2.09
export const T_DONE = T_SOURCE + SOURCE_FADE                    // ≈ 2.29  (< 2.5s)

export const REDUCED_T_DONE = REDUCED_CROSSFADE + 0.3

export const ms = (s: number) => Math.round(s * 1000)
