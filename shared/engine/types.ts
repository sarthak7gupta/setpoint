/**
 * Core domain types for the SetPoint scoring engine.
 * @see docs/ENGINE.md
 */

/** Competing sides — singles player or doubles team. */
export type Side = 'a' | 'b'
export type Format = 'singles' | 'doubles'
/** Receiver court for the upcoming point. */
export type CourtSide = 'deuce' | 'ad'
export type PointOutcome = 'winner' | 'unforced_error' | 'ace' | 'double_fault' | 'other'

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'
export type CourtSurface = 'grass' | 'clay' | 'hard' | 'carpet' | 'indoor' | 'concrete'
export type ThemeId = 'wimbledon' | 'rolandGarros' | 'usOpen' | 'australianOpen'
/** Blocking UI overlays — scoring is frozen until dismiss (except match_end). */
export type OverlayKind =
  | 'none'
  | 'warmup'
  | 'changeover'
  | 'ball_change'
  | 'set_break'
  | 'match_end'

/** Immutable match rules chosen at start (best-of, TB lengths, timers, lineup). */
export interface MatchConfig {
  format: Format
  bestOf: 1 | 3 | 5
  tiebreakPoints: number
  finalSetTiebreak: boolean
  finalSetTiebreakPoints: number
  /** At 40–40 the next point wins the game (no advantage). */
  noAdScoring?: boolean
  breakDurationSeconds: number
  changeoverDurationSeconds: number
  /** Show a warm-up timer when the match is created (default off; New Match enables). */
  warmupEnabled?: boolean
  /** Warm-up timer length in seconds (default 300). */
  warmupDurationSeconds?: number
  /** Remind to change balls (ATP-style schedule by default). */
  ballChangeEnabled?: boolean
  /** First ball change after this many completed games (default 7). */
  ballChangeFirstGames?: number
  /** Subsequent ball changes every N games after the first (default 9). */
  ballChangeEveryGames?: number
  /** Timer on the ball-change overlay (defaults to changeover duration). */
  ballChangeDurationSeconds?: number
  /** Singles: [a, b]. Doubles: [a1, a2, b1, b2] */
  playerIds: string[]
  firstServerId: string
  /** Doubles: first receiver on the opposing team (deuce court). */
  firstReceiverId?: string
}

/** Non-scoring context stored with the match (weather, surface, notes). */
export interface MatchMetadata {
  date: string
  timeOfDay?: TimeOfDay
  weather?: string
  courtSurface?: CourtSurface
  notes?: string
}

/**
 * One completed point. Pressure flags describe the situation *before* the point
 * was played (break/game/set/match point facing the next ball).
 */
export interface PointEvent {
  id: string
  winnerSide: Side
  /** Optional in doubles — team default when omitted. */
  attributedPlayerId?: string
  outcome: PointOutcome
  serveNumber: 1 | 2
  /** True when the point was played on a second serve (after a fault). */
  hadFirstServeFault: boolean
  serverId: string
  receiverId: string
  isBreakPoint: boolean
  isGamePoint: boolean
  isSetPoint: boolean
  isMatchPoint: boolean
  setIndex: number
  timestamp: number
}

export interface GameScore {
  pointsA: number
  pointsB: number
}

export interface SetScore {
  gamesA: number
  gamesB: number
  isTiebreak: boolean
  tiebreakPointsA: number
  tiebreakPointsB: number
  completed: boolean
  winner?: Side
}

/**
 * Full live match snapshot. Treat as immutable — engine APIs return new objects.
 * Persisted wholesale in Dexie; undo restores prior clones of this shape.
 */
export interface MatchState {
  config: MatchConfig
  metadata: MatchMetadata
  sets: SetScore[]
  currentGame: GameScore
  serverId: string
  receiverId: string
  receiverCourt: CourtSide
  /** Full serve rotation for the match (2 or 4 players). */
  serveOrder: string[]
  serveOrderIndex: number
  /** Who served the first game of the current set. */
  setFirstServerId: string
  isSecondServe: boolean
  tiebreakPointsPlayed: number
  /** Deuce-court receiver for each side when that side is receiving. */
  deuceReceiverBySide: Record<Side, string>
  events: PointEvent[]
  pendingOverlay: OverlayKind
  isComplete: boolean
  winner?: Side
  /**
   * How the match ended when not by playing out all sets.
   * `walkover` awards the match as-is without inventing remaining games.
   */
  endedBy?: 'walkover'
  /** Completed games in current set (for changeover: after odd total). */
  gamesCompletedInSet: number
  /** Completed games in the match (TB counts as one) — drives ball changes. */
  gamesCompletedInMatch: number
  /**
   * Ball change was due on a tiebreak (or set end stole the overlay) — show
   * `ball_change` after the set break or the next non-TB game.
   */
  deferredBallChange?: boolean
  /** Wall-clock start (ms since epoch). */
  startedAt: number
  /** Wall-clock end when the match completes (ms since epoch). */
  finishedAt?: number
  /** When set, the match clock is frozen at this timestamp. */
  pausedAt?: number
  /** Accumulated pause duration in ms (not including an in-progress pause). */
  pausedMs?: number
  /**
   * When set, the live match screen is not active (home, another screen, or
   * backgrounded). Clock freezes here without showing the pause overlay.
   */
  awayAt?: number
}

/** User input for awarding a point (faults use `applyFault` separately). */
export interface PointInput {
  winnerSide: Side
  outcome: PointOutcome
  attributedPlayerId?: string
}

export interface ServeInfo {
  serverId: string
  receiverId: string
  receiverCourt: CourtSide
  servingSide: Side
  receivingSide: Side
  isTiebreak: boolean
  isSecondServe: boolean
  nextServeLabel: string
}
