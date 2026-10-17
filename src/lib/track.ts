// Analytics: none in v1. A single no-op so call sites exist and a backend can be wired later.
export type TrackEvent = 'play_start' | 'claim_lock' | 'day_complete' | 'share' | 'fact_check' | 'second_look'

export function track(_event: TrackEvent, _props?: Record<string, string | number | boolean>): void {
  // intentionally empty
}
