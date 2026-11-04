import { skipDisabledTimerOverlay } from '../engine/scoring'
import type {
  CourtSurface,
  MatchConfig,
  MatchMetadata,
  MatchState,
  TimeOfDay,
} from '../engine/types'
import type { MatchRecord } from '../records'

/** Keep record-level and in-state metadata in sync when details are edited. */
export function withMatchMetadata(args: {
  record: MatchRecord
  metadata: MatchMetadata
  updatedAt: number
}): MatchRecord {
  const { record, metadata, updatedAt } = args
  return {
    ...record,
    metadata,
    state: { ...record.state, metadata },
    updatedAt,
  }
}

/**
 * Match options that may change mid-match without rewriting the score:
 * timer lengths, ball-change reminders, and court details.
 */
export interface LiveMatchSettings {
  breakDurationSeconds: number
  changeoverDurationSeconds: number
  warmupDurationSeconds: number
  ballChangeEnabled: boolean
  ballChangeFirstGames: number
  ballChangeEveryGames: number
  ballChangeDurationSeconds: number
  date: string
  timeOfDay?: TimeOfDay
  weather: string
  courtSurface?: CourtSurface
  notes: string
}

function floorAtLeast(value: number, min: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.floor(value))
}

export function liveMatchSettingsFrom(state: MatchState): LiveMatchSettings {
  const { config, metadata } = state
  return {
    breakDurationSeconds: config.breakDurationSeconds,
    changeoverDurationSeconds: config.changeoverDurationSeconds,
    warmupDurationSeconds: config.warmupDurationSeconds ?? 300,
    ballChangeEnabled: config.ballChangeEnabled !== false,
    ballChangeFirstGames: config.ballChangeFirstGames ?? 7,
    ballChangeEveryGames: config.ballChangeEveryGames ?? 9,
    ballChangeDurationSeconds: config.ballChangeDurationSeconds ?? config.changeoverDurationSeconds,
    date: metadata.date,
    timeOfDay: metadata.timeOfDay,
    weather: metadata.weather ?? '',
    courtSurface: metadata.courtSurface,
    notes: metadata.notes ?? '',
  }
}

/** Patch timers / details onto live state. Scoring rules are left untouched. */
export function applyLiveMatchSettingsToState(
  state: MatchState,
  settings: LiveMatchSettings,
): MatchState {
  const config: MatchConfig = {
    ...state.config,
    breakDurationSeconds: floorAtLeast(settings.breakDurationSeconds, 0),
    changeoverDurationSeconds: floorAtLeast(settings.changeoverDurationSeconds, 0),
    warmupDurationSeconds: floorAtLeast(settings.warmupDurationSeconds, 0),
    ballChangeEnabled: settings.ballChangeEnabled,
    ballChangeFirstGames: floorAtLeast(settings.ballChangeFirstGames, 1),
    ballChangeEveryGames: floorAtLeast(settings.ballChangeEveryGames, 1),
    ballChangeDurationSeconds: floorAtLeast(settings.ballChangeDurationSeconds, 0),
  }
  const metadata: MatchMetadata = {
    ...state.metadata,
    date: settings.date,
    timeOfDay: settings.timeOfDay,
    weather: settings.weather.trim() || undefined,
    courtSurface: settings.courtSurface,
    notes: settings.notes.trim() || undefined,
  }
  return skipDisabledTimerOverlay({ ...state, config, metadata })
}

export function applyLiveMatchSettings(args: {
  record: MatchRecord
  settings: LiveMatchSettings
  updatedAt: number
}): MatchRecord {
  const state = applyLiveMatchSettingsToState(args.record.state, args.settings)
  return {
    ...args.record,
    config: state.config,
    metadata: state.metadata,
    state,
    updatedAt: args.updatedAt,
  }
}

/** Keep undo snapshots on the same timers / details as the live match. */
export function stampLiveSettingsOnHistory(
  history: MatchState[],
  config: MatchConfig,
  metadata: MatchMetadata,
): MatchState[] {
  return history.map((snap) => ({ ...snap, config, metadata }))
}
