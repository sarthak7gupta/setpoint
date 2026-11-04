/**
 * Shared helpers for engine / stats tests.
 * Keep match factories here so scenarios stay consistent across suites.
 */
import { applyFault, applyPoint, createMatch, dismissOverlay } from './scoring'
import type { MatchConfig, MatchMetadata, MatchState, PointOutcome, Side } from './types'

export const testMeta: MatchMetadata = {
  date: '2026-08-31',
  courtSurface: 'hard',
  timeOfDay: 'evening',
}

export function singlesConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    format: 'singles',
    bestOf: 3,
    tiebreakPoints: 7,
    finalSetTiebreak: true,
    finalSetTiebreakPoints: 10,
    breakDurationSeconds: 120,
    changeoverDurationSeconds: 90,
    playerIds: ['p1', 'p2'],
    firstServerId: 'p1',
    ...overrides,
  }
}

export function doublesConfig(overrides: Partial<MatchConfig> = {}): MatchConfig {
  return {
    format: 'doubles',
    bestOf: 3,
    tiebreakPoints: 7,
    finalSetTiebreak: true,
    finalSetTiebreakPoints: 10,
    breakDurationSeconds: 120,
    changeoverDurationSeconds: 90,
    playerIds: ['a1', 'a2', 'b1', 'b2'],
    firstServerId: 'a1',
    firstReceiverId: 'b1',
    ...overrides,
  }
}

export function freshSingles(overrides?: Partial<MatchConfig>): MatchState {
  return createMatch(singlesConfig(overrides), testMeta)
}

export function freshDoubles(overrides?: Partial<MatchConfig>): MatchState {
  return createMatch(doublesConfig(overrides), testMeta)
}

export function winPoint(
  state: MatchState,
  side: Side,
  outcome: PointOutcome = 'winner',
  attributedPlayerId?: string,
): MatchState {
  return applyPoint(state, { winnerSide: side, outcome, attributedPlayerId })
}

/** Auto-dismiss warmup / changeover / ball_change / set_break overlays so helpers can keep scoring. */
export function clearOverlay(state: MatchState): MatchState {
  if (
    state.pendingOverlay === 'warmup' ||
    state.pendingOverlay === 'changeover' ||
    state.pendingOverlay === 'ball_change' ||
    state.pendingOverlay === 'set_break'
  ) {
    return dismissOverlay(state)
  }
  return state
}

/**
 * Win one game for `side` by taking consecutive points.
 * Returns as soon as a game/set/match boundary is reached (overlay or score bump).
 */
export function winGame(state: MatchState, side: Side): MatchState {
  let s = clearOverlay(state)
  for (let i = 0; i < 12; i++) {
    s = clearOverlay(s)
    const setIndex = s.sets.length - 1
    const gamesBefore = side === 'a' ? s.sets[setIndex].gamesA : s.sets[setIndex].gamesB
    const completedBefore = s.sets.filter((set) => set.completed).length
    s = winPoint(s, side)
    const completedAfter = s.sets.filter((set) => set.completed).length
    if (
      completedAfter > completedBefore ||
      s.pendingOverlay === 'changeover' ||
      s.pendingOverlay === 'ball_change' ||
      s.pendingOverlay === 'set_break' ||
      s.pendingOverlay === 'match_end' ||
      s.isComplete
    ) {
      return s
    }
    const setAfter = s.sets[Math.min(setIndex, s.sets.length - 1)]
    const gamesAfter = side === 'a' ? setAfter.gamesA : setAfter.gamesB
    if (gamesAfter > gamesBefore) return s
  }
  return s
}

/** Reach 6-6 in the current set (alternating games), then return TB-ready state. */
export function reachSixAll(state: MatchState): MatchState {
  let s = state
  for (let g = 0; g < 6; g++) {
    s = winGame(s, 'a')
    s = clearOverlay(s)
    s = winGame(s, 'b')
    s = clearOverlay(s)
  }
  return s
}

export function winSetToLove(state: MatchState, side: Side): MatchState {
  let s = state
  for (let g = 0; g < 6; g++) {
    s = winGame(s, side)
    if (s.pendingOverlay === 'changeover' || s.pendingOverlay === 'ball_change') {
      s = clearOverlay(s)
    }
  }
  return s
}

/** Simulate app undo stack: push before each mutating apply. */
export function withUndoStack() {
  const stack: MatchState[] = []
  return {
    stack,
    apply(state: MatchState, next: MatchState): MatchState {
      stack.push(structuredClone(state))
      return next
    },
    undo(current: MatchState): MatchState {
      return stack.pop() ?? current
    },
    fault(state: MatchState): MatchState {
      stack.push(structuredClone(state))
      return applyFault(state)
    },
    point(state: MatchState, side: Side, outcome: PointOutcome = 'winner'): MatchState {
      stack.push(structuredClone(state))
      return winPoint(state, side, outcome)
    },
    dismiss(state: MatchState): MatchState {
      // App does not push dismiss onto undo history
      return dismissOverlay(state)
    },
  }
}
