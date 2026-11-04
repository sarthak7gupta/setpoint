/**
 * Pure scoring state machine: create match, apply points/faults, dismiss overlays.
 * No React / storage — see docs/ENGINE.md.
 */
import { isBallChangeDue } from './ballChange'
import { shouldChangeoverAfterGame, shouldChangeoverInTiebreak } from './changeover'
import {
  assertFormatPlayers,
  buildServeOrder,
  createId,
  displayPoint,
  gameWinner,
  oppositeSide,
  setsToWin,
  sideOfPlayer,
} from './helpers'
import {
  ballChangeOverlayEnabled,
  changeoverOverlayEnabled,
  isTimerOverlayDisabled,
  setBreakOverlayEnabled,
  warmupManualOverlayEnabled,
  warmupStartOverlayEnabled,
} from './overlayTimers'
import { pressureFlagsForState } from './pressure'
import { isFinalSetIndex, tiebreakTargetForSet } from './rules'
import {
  advanceServerAfterGame,
  advanceServerAfterTiebreakPoint,
  getServeInfo,
  getServingSide,
  isInTiebreak,
  startNewSet,
  syncServeReceive,
} from './serve'
import type { MatchConfig, MatchMetadata, MatchState, PointEvent, PointInput, Side } from './types'
import { assertMatchConfig } from './validation'

/**
 * Resolve changeover vs ball-change after a completed game.
 * If a ball change falls on a tiebreak, defer it (TB counts toward the total,
 * but the reminder waits until after the TB / set break).
 */
function overlaysAfterGame(
  state: MatchState,
  changeover: boolean,
  fallsOnTiebreak: boolean,
): Pick<MatchState, 'pendingOverlay' | 'deferredBallChange'> {
  const due = isBallChangeDue(state.config, state.gamesCompletedInMatch ?? 0)
  const wasDeferred = Boolean(state.deferredBallChange)
  const changePopup = changeover && changeoverOverlayEnabled(state.config)
  const ballPopup = ballChangeOverlayEnabled(state.config)

  if ((due || wasDeferred) && fallsOnTiebreak) {
    return {
      pendingOverlay: changePopup ? 'changeover' : 'none',
      deferredBallChange: true,
    }
  }

  if ((due || wasDeferred) && ballPopup) {
    return { pendingOverlay: 'ball_change', deferredBallChange: false }
  }

  return {
    pendingOverlay: changePopup ? 'changeover' : 'none',
    deferredBallChange: false,
  }
}

function withPostSetOverlay(state: MatchState, deferredBallChange: boolean): MatchState {
  if (setBreakOverlayEnabled(state.config)) {
    return { ...state, pendingOverlay: 'set_break', deferredBallChange }
  }
  if (deferredBallChange && ballChangeOverlayEnabled(state.config)) {
    return { ...state, pendingOverlay: 'ball_change', deferredBallChange: false }
  }
  return { ...state, pendingOverlay: 'none', deferredBallChange: false }
}

function skipDisabledTimerOverlay(state: MatchState): MatchState {
  let next = state
  for (let i = 0; i < 3; i++) {
    if (!isTimerOverlayDisabled(next.config, next.pendingOverlay)) break
    next = dismissOverlay(next)
  }
  return next
}

function withDeferredIfBallChangeDue(state: MatchState): boolean {
  return (
    Boolean(state.deferredBallChange) ||
    isBallChangeDue(state.config, state.gamesCompletedInMatch ?? 0)
  )
}

/** Build initial `MatchState` with serve order and first receiver synced. */
export function createMatch(config: MatchConfig, metadata: MatchMetadata): MatchState {
  assertFormatPlayers(config.format, config.playerIds)
  if (!config.playerIds.includes(config.firstServerId)) {
    throw new Error('firstServerId must be one of the match players')
  }

  assertMatchConfig(config)
  const serveOrder = buildServeOrder(config, config.firstServerId, config.firstReceiverId)
  const serverId = serveOrder[0]
  const servingSide = sideOfPlayer(config, serverId)
  const receivingSide = oppositeSide(servingSide)

  const deuceReceiverBySide: Record<Side, string> = {
    a: config.format === 'singles' ? config.playerIds[0] : config.playerIds[0],
    b: config.format === 'singles' ? config.playerIds[1] : config.playerIds[2],
  }

  if (config.format === 'doubles') {
    const firstReceiver =
      config.firstReceiverId && sideOfPlayer(config, config.firstReceiverId) === receivingSide
        ? config.firstReceiverId
        : serveOrder[1]
    deuceReceiverBySide[receivingSide] = firstReceiver
    // Other team: partner of first server is not receiving first game; set their deuce receiver to first of that side
    const servingPlayers =
      servingSide === 'a'
        ? [config.playerIds[0], config.playerIds[1]]
        : [config.playerIds[2], config.playerIds[3]]
    deuceReceiverBySide[servingSide] = servingPlayers[0]
  }

  const base: MatchState = {
    config,
    metadata,
    sets: [
      {
        gamesA: 0,
        gamesB: 0,
        isTiebreak: false,
        tiebreakPointsA: 0,
        tiebreakPointsB: 0,
        completed: false,
      },
    ],
    currentGame: { pointsA: 0, pointsB: 0 },
    serverId,
    receiverId: '',
    receiverCourt: 'deuce',
    serveOrder,
    serveOrderIndex: 0,
    setFirstServerId: serverId,
    isSecondServe: false,
    tiebreakPointsPlayed: 0,
    deuceReceiverBySide,
    events: [],
    pendingOverlay: warmupStartOverlayEnabled(config) ? 'warmup' : 'none',
    isComplete: false,
    gamesCompletedInSet: 0,
    gamesCompletedInMatch: 0,
    deferredBallChange: false,
    startedAt: Date.now(),
  }

  return syncServeReceive(base)
}

/**
 * First call → second serve. Second call → double fault (receiving side wins the point).
 * No-ops while an overlay is pending or the match is over.
 */
export function applyFault(state: MatchState): MatchState {
  if (state.isComplete || state.pendingOverlay === 'match_end') return state
  if (state.pendingOverlay !== 'none') return state
  if (state.pausedAt) return state

  if (!state.isSecondServe) {
    return { ...state, isSecondServe: true }
  }

  // Double fault — serving side loses the point
  const servingSide = getServingSide(state)
  return applyPoint(state, {
    winnerSide: oppositeSide(servingSide),
    outcome: 'double_fault',
  })
}

function cloneState(state: MatchState): MatchState {
  return structuredClone(state)
}

function neededSets(config: MatchConfig): number {
  return setsToWin(config.bestOf)
}

function countSetsWon(state: MatchState, side: Side): number {
  return state.sets.filter((s) => s.completed && s.winner === side).length
}

function isFinalSet(state: MatchState): boolean {
  return isFinalSetIndex(state.config, state.sets.length - 1)
}

function tiebreakTarget(state: MatchState): number {
  return tiebreakTargetForSet(state.config, state.sets.length - 1)
}

function usesAdvantageFinalSet(state: MatchState): boolean {
  return isFinalSet(state) && !state.config.finalSetTiebreak
}

function completeGame(state: MatchState, winner: Side): MatchState {
  const setIndex = state.sets.length - 1
  let sets = state.sets.map((s, i) => {
    if (i !== setIndex) return s
    return {
      ...s,
      gamesA: s.gamesA + (winner === 'a' ? 1 : 0),
      gamesB: s.gamesB + (winner === 'b' ? 1 : 0),
    }
  })

  let next: MatchState = {
    ...state,
    sets,
    currentGame: { pointsA: 0, pointsB: 0 },
    gamesCompletedInSet: state.gamesCompletedInSet + 1,
    gamesCompletedInMatch: (state.gamesCompletedInMatch ?? 0) + 1,
    isSecondServe: false,
    tiebreakPointsPlayed: 0,
  }

  const set = next.sets[setIndex]
  const setWinner = decideSetWinner(next, set)

  if (setWinner) {
    sets = next.sets.map((s, i) =>
      i === setIndex ? { ...s, completed: true, winner: setWinner } : s,
    )
    next = { ...next, sets }
    const matchWinner = decideMatchWinner({ ...next, sets })
    if (matchWinner) {
      return {
        ...next,
        isComplete: true,
        winner: matchWinner,
        pendingOverlay: 'match_end',
        serverId: next.serverId,
        deferredBallChange: false,
        finishedAt: Date.now(),
      }
    }
    // Set break — advance server for next set, then overlay
    const advanced = advanceServerAfterGame(next)
    const withNewSet = startNewSet(advanced)
    return withPostSetOverlay(withNewSet, withDeferredIfBallChangeDue(next))
  }

  // Check if we need a tiebreak at 6-6
  if (set.gamesA === 6 && set.gamesB === 6 && !set.isTiebreak) {
    if (usesAdvantageFinalSet(next)) {
      // Continue advantage set — no TB
      const advanced = advanceServerAfterGame(next)
      const changeover = shouldChangeoverAfterGame(advanced.gamesCompletedInSet)
      return {
        ...advanced,
        ...overlaysAfterGame(advanced, changeover, false),
      }
    }
    // Start tiebreak — ball change due here is deferred until after the TB
    const advanced = advanceServerAfterGame(next)
    const tbSets = advanced.sets.map((s, i) =>
      i === setIndex ? { ...s, isTiebreak: true, tiebreakPointsA: 0, tiebreakPointsB: 0 } : s,
    )
    const withTb = syncServeReceive({
      ...advanced,
      sets: tbSets,
      currentGame: { pointsA: 0, pointsB: 0 },
      tiebreakPointsPlayed: 0,
    })
    return {
      ...withTb,
      ...overlaysAfterGame(withTb, shouldChangeoverAfterGame(advanced.gamesCompletedInSet), true),
    }
  }

  const advanced = advanceServerAfterGame(next)
  const changeover = shouldChangeoverAfterGame(advanced.gamesCompletedInSet)
  return {
    ...advanced,
    ...overlaysAfterGame(advanced, changeover, false),
  }
}

function decideSetWinner(state: MatchState, set: MatchState['sets'][0]): Side | null {
  if (set.isTiebreak) {
    const target = tiebreakTarget(state)
    if (set.tiebreakPointsA >= target && set.tiebreakPointsA >= set.tiebreakPointsB + 2) {
      return 'a'
    }
    if (set.tiebreakPointsB >= target && set.tiebreakPointsB >= set.tiebreakPointsA + 2) {
      return 'b'
    }
    return null
  }

  if (usesAdvantageFinalSet(state)) {
    if (set.gamesA >= 6 && set.gamesA >= set.gamesB + 2) return 'a'
    if (set.gamesB >= 6 && set.gamesB >= set.gamesA + 2) return 'b'
    return null
  }

  if (set.gamesA >= 6 && set.gamesA >= set.gamesB + 2) return 'a'
  if (set.gamesB >= 6 && set.gamesB >= set.gamesA + 2) return 'b'
  // TB win already handled via isTiebreak path when TB completes — games become 7-6
  return null
}

function decideMatchWinner(state: MatchState): Side | null {
  const need = neededSets(state.config)
  if (countSetsWon(state, 'a') >= need) return 'a'
  if (countSetsWon(state, 'b') >= need) return 'b'
  return null
}

function completeTiebreak(state: MatchState, winner: Side): MatchState {
  const setIndex = state.sets.length - 1
  const sets = state.sets.map((s, i) => {
    if (i !== setIndex) return s
    return {
      ...s,
      gamesA: s.gamesA + (winner === 'a' ? 1 : 0),
      gamesB: s.gamesB + (winner === 'b' ? 1 : 0),
      completed: true,
      winner,
      isTiebreak: true,
    }
  })

  let next: MatchState = {
    ...state,
    sets,
    currentGame: { pointsA: 0, pointsB: 0 },
    gamesCompletedInSet: state.gamesCompletedInSet + 1,
    gamesCompletedInMatch: (state.gamesCompletedInMatch ?? 0) + 1,
    isSecondServe: false,
  }

  const matchWinner = decideMatchWinner(next)
  if (matchWinner) {
    return {
      ...next,
      isComplete: true,
      winner: matchWinner,
      pendingOverlay: 'match_end',
      deferredBallChange: false,
      finishedAt: Date.now(),
    }
  }

  const advanced = advanceServerAfterGame(next)
  const withNewSet = startNewSet(advanced)
  return withPostSetOverlay(withNewSet, withDeferredIfBallChangeDue(next))
}

/**
 * Award a point, append a `PointEvent`, and advance game/set/match / overlays.
 * Blocked while `pendingOverlay !== 'none'` (including match end).
 */
export function applyPoint(state: MatchState, input: PointInput): MatchState {
  if (state.isComplete || state.pendingOverlay === 'match_end') return state
  if (state.pendingOverlay !== 'none') return state
  if (state.pausedAt) return state

  const flags = pressureFlagsForState(state)
  const serveNumber: 1 | 2 = state.isSecondServe ? 2 : 1
  const hadFirstServeFault = state.isSecondServe
  const synced = syncServeReceive(state)

  const event: PointEvent = {
    id: createId(),
    winnerSide: input.winnerSide,
    attributedPlayerId: input.attributedPlayerId,
    outcome: input.outcome,
    serveNumber,
    hadFirstServeFault,
    serverId: synced.serverId,
    receiverId: synced.receiverId,
    setIndex: state.sets.length - 1,
    timestamp: Date.now(),
    ...flags,
  }

  // Ace must be won by serving side
  if (input.outcome === 'ace' && input.winnerSide !== getServingSide(state)) {
    event.outcome = 'winner'
  }
  if (input.outcome === 'double_fault' && input.winnerSide === getServingSide(state)) {
    event.winnerSide = oppositeSide(getServingSide(state))
  }

  let next: MatchState = {
    ...synced,
    events: [...synced.events, event],
    isSecondServe: false,
  }

  if (isInTiebreak(next)) {
    const setIndex = next.sets.length - 1
    const sets = next.sets.map((s, i) => {
      if (i !== setIndex) return s
      return {
        ...s,
        tiebreakPointsA: s.tiebreakPointsA + (event.winnerSide === 'a' ? 1 : 0),
        tiebreakPointsB: s.tiebreakPointsB + (event.winnerSide === 'b' ? 1 : 0),
      }
    })
    next = {
      ...next,
      sets,
      tiebreakPointsPlayed: next.tiebreakPointsPlayed + 1,
    }

    const set = next.sets[setIndex]
    const tbWinner = decideSetWinner(next, set)
    if (tbWinner) {
      return completeTiebreak(next, tbWinner)
    }

    const advanced = advanceServerAfterTiebreakPoint(next)
    const changeover =
      shouldChangeoverInTiebreak(advanced.tiebreakPointsPlayed) &&
      changeoverOverlayEnabled(advanced.config)
    return {
      ...advanced,
      pendingOverlay: changeover ? 'changeover' : 'none',
    }
  }

  // Regular game
  const pointsA = next.currentGame.pointsA + (event.winnerSide === 'a' ? 1 : 0)
  const pointsB = next.currentGame.pointsB + (event.winnerSide === 'b' ? 1 : 0)
  next = {
    ...next,
    currentGame: { pointsA, pointsB },
  }

  const gw = gameWinner(pointsA, pointsB, Boolean(next.config.noAdScoring))
  if (gw) {
    return completeGame(next, gw)
  }

  return syncServeReceive(next)
}

/**
 * Clear warmup / changeover / ball_change / set_break. Does not alter score.
 * After a set break, a deferred ball change (e.g. due on a tiebreak) is shown next.
 * UI must not push this onto the undo stack (see `useMatchController.skipOverlay`).
 */
export function dismissOverlay(state: MatchState): MatchState {
  if (state.pendingOverlay === 'match_end') return state
  if (state.pendingOverlay === 'set_break' && state.deferredBallChange) {
    if (ballChangeOverlayEnabled(state.config)) {
      return { ...state, pendingOverlay: 'ball_change', deferredBallChange: false }
    }
    return { ...state, pendingOverlay: 'none', deferredBallChange: false }
  }
  if (state.pendingOverlay === 'ball_change') {
    return { ...state, pendingOverlay: 'none', deferredBallChange: false }
  }
  // changeover / warmup dismiss keeps deferredBallChange so a TB-deferred change still fires later
  return { ...state, pendingOverlay: 'none' }
}

function clearBlockingOverlays(state: MatchState): MatchState {
  let next = state
  while (
    next.pendingOverlay === 'warmup' ||
    next.pendingOverlay === 'changeover' ||
    next.pendingOverlay === 'ball_change' ||
    next.pendingOverlay === 'set_break'
  ) {
    next = dismissOverlay(next)
  }
  return next
}

/**
 * Rebuild match state from a prefix of `events`, dismissing break overlays
 * between points the way the live scorer does. Preserves `startedAt` and
 * original event ids / timestamps.
 */
export function replayEvents(args: {
  config: MatchConfig
  metadata: MatchMetadata
  events: PointEvent[]
  startedAt: number
}): MatchState {
  const { config, metadata, events, startedAt } = args
  let next = { ...createMatch(config, metadata), startedAt }
  next = clearBlockingOverlays(next)

  for (const event of events) {
    next = clearBlockingOverlays(next)
    if (event.hadFirstServeFault && !next.isSecondServe) {
      next = applyFault(next)
    }
    next = applyPoint(next, {
      winnerSide: event.winnerSide,
      outcome: event.outcome,
      attributedPlayerId: event.attributedPlayerId,
    })
    const applied = next.events[next.events.length - 1]
    if (applied) {
      next = {
        ...next,
        events: [
          ...next.events.slice(0, -1),
          { ...applied, id: event.id, timestamp: event.timestamp },
        ],
      }
    }
  }
  return next
}

/** Drop the last point (e.g. mistaken match-winner) by replaying earlier events. */
export function undoLastPoint(state: MatchState): MatchState | null {
  if (state.events.length === 0) return null
  return replayEvents({
    config: state.config,
    metadata: state.metadata,
    events: state.events.slice(0, -1),
    startedAt: state.startedAt,
  })
}

/**
 * Award the match without playing out remaining games/sets (walkover).
 * Keeps the current scoreboard; clears pause / away / blocking timers.
 */
export function applyWalkover(state: MatchState, args: { winnerSide: Side }): MatchState {
  if (state.isComplete || state.pendingOverlay === 'match_end') return state
  return {
    ...state,
    isComplete: true,
    winner: args.winnerSide,
    endedBy: 'walkover',
    finishedAt: Date.now(),
    pendingOverlay: 'match_end',
    pausedAt: undefined,
    awayAt: undefined,
    isSecondServe: false,
  }
}

/** Reopen a match that was closed by walkover (score and events unchanged). */
export function undoWalkover(state: MatchState): MatchState | null {
  if (!state.isComplete || state.endedBy !== 'walkover') return null
  return {
    ...state,
    isComplete: false,
    winner: undefined,
    endedBy: undefined,
    finishedAt: undefined,
    pendingOverlay: 'none',
  }
}

/**
 * Start (or re-start) the warm-up timer. Used after a delay when resuming a match.
 * No-ops if the match is complete or another overlay is already showing.
 */
export function startWarmup(state: MatchState): MatchState {
  if (state.isComplete || state.pendingOverlay === 'match_end') return state
  if (state.pendingOverlay !== 'none') return state
  if (!warmupManualOverlayEnabled(state.config)) return state
  return { ...state, pendingOverlay: 'warmup' }
}

export { cloneState, getServeInfo, skipDisabledTimerOverlay }

/** Display strings for the current game (or TB point totals). */
export function formatGameScore(state: MatchState): {
  pointsA: string
  pointsB: string
} {
  if (isInTiebreak(state)) {
    const set = state.sets[state.sets.length - 1]
    return {
      pointsA: String(set.tiebreakPointsA),
      pointsB: String(set.tiebreakPointsB),
    }
  }
  return {
    pointsA: displayPoint(state.currentGame.pointsA, state.currentGame.pointsB),
    pointsB: displayPoint(state.currentGame.pointsB, state.currentGame.pointsA),
  }
}
