/**
 * Match wall-clock helpers (start → now, or frozen at finish / pause / away).
 */
import type { MatchState } from '../engine/types'

/** Format elapsed ms as `M:SS`, `MM:SS`, or `H:MM:SS`. */
export function formatMatchClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

/** Resolve match start time (supports older saves without `startedAt`). */
export function matchStartedAt(state: MatchState, fallback?: number): number {
  if (typeof state.startedAt === 'number' && state.startedAt > 0) return state.startedAt
  if (state.events.length > 0) return state.events[0].timestamp
  if (typeof fallback === 'number' && fallback > 0) return fallback
  return Date.now()
}

/**
 * Elapsed match time in ms.
 * Freezes when the match is complete, user-paused, or the live screen is away.
 */
export function matchElapsedMs(
  state: MatchState,
  args: { now?: number; fallbackStart?: number } = {},
): number {
  const now = args.now ?? Date.now()
  const start = matchStartedAt(state, args.fallbackStart)
  const end =
    state.isComplete && typeof state.finishedAt === 'number'
      ? state.finishedAt
      : state.pausedAt
        ? state.pausedAt
        : state.awayAt
          ? state.awayAt
          : now
  const paused = state.pausedMs ?? 0
  return Math.max(0, end - start - paused)
}
