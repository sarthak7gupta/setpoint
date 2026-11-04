/**
 * Overlay timers: a duration of 0 means that popup is off.
 */
import type { MatchConfig, OverlayKind } from './types'

export function overlayTimerEnabled(seconds: number | undefined): boolean {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0
}

export function warmupDurationSeconds(config: MatchConfig): number {
  if (config.warmupDurationSeconds !== undefined) {
    return overlayTimerEnabled(config.warmupDurationSeconds) ? config.warmupDurationSeconds : 0
  }
  return config.warmupEnabled ? 300 : 0
}

/** Warm-up at match create — requires the toggle *and* a positive duration. */
export function warmupStartOverlayEnabled(config: MatchConfig): boolean {
  return config.warmupEnabled === true && warmupDurationSeconds(config) > 0
}

/** Manual “Start warm-up” — only the duration matters. */
export function warmupManualOverlayEnabled(config: MatchConfig): boolean {
  return overlayTimerEnabled(config.warmupDurationSeconds ?? 300)
}

export function changeoverOverlayEnabled(config: MatchConfig): boolean {
  return overlayTimerEnabled(config.changeoverDurationSeconds)
}

export function setBreakOverlayEnabled(config: MatchConfig): boolean {
  return overlayTimerEnabled(config.breakDurationSeconds)
}

export function ballChangeDurationSeconds(config: MatchConfig): number {
  return config.ballChangeDurationSeconds ?? config.changeoverDurationSeconds
}

export function ballChangeOverlayEnabled(config: MatchConfig): boolean {
  return overlayTimerEnabled(ballChangeDurationSeconds(config))
}

export function isTimerOverlayDisabled(config: MatchConfig, kind: OverlayKind): boolean {
  if (kind === 'warmup') return !warmupManualOverlayEnabled(config)
  if (kind === 'changeover') return !changeoverOverlayEnabled(config)
  if (kind === 'set_break') return !setBreakOverlayEnabled(config)
  if (kind === 'ball_change') return !ballChangeOverlayEnabled(config)
  return false
}
