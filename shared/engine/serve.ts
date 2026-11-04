/**
 * Serve / receive resolution and rotation (games and tiebreak).
 * @see docs/ENGINE.md
 */
import { oppositeSide, partnerOf, playersOnSide, sideOfPlayer } from './helpers'
import type { CourtSide, MatchState, ServeInfo, Side } from './types'

export function getServingSide(state: MatchState): Side {
  return sideOfPlayer(state.config, state.serverId)
}

export function getReceivingSide(state: MatchState): Side {
  return oppositeSide(getServingSide(state))
}

export function totalPointsInGame(state: MatchState): number {
  if (isInTiebreak(state)) {
    const set = state.sets[state.sets.length - 1]
    return set.tiebreakPointsA + set.tiebreakPointsB
  }
  return state.currentGame.pointsA + state.currentGame.pointsB
}

/** True while the current set is in an unfinished tiebreak. */
export function isInTiebreak(state: MatchState): boolean {
  const set = state.sets[state.sets.length - 1]
  return set.isTiebreak && !set.completed
}

/** Even point index → deuce court; odd → ad. */
export function courtForPointIndex(pointIndex: number): CourtSide {
  return pointIndex % 2 === 0 ? 'deuce' : 'ad'
}

/** Receiver for the upcoming point based on court and deuce-receiver map. */
export function resolveReceiver(state: MatchState): {
  receiverId: string
  receiverCourt: CourtSide
} {
  const receivingSide = getReceivingSide(state)
  const court = courtForPointIndex(totalPointsInGame(state))

  if (state.config.format === 'singles') {
    return {
      receiverId: playersOnSide(state.config, receivingSide)[0],
      receiverCourt: court,
    }
  }

  const deuceReceiver = state.deuceReceiverBySide[receivingSide]
  const adReceiver = partnerOf(state.config, deuceReceiver)!
  return {
    receiverId: court === 'deuce' ? deuceReceiver : adReceiver,
    receiverCourt: court,
  }
}

/** Recompute `receiverId` / `receiverCourt` from current server and point count. */
export function syncServeReceive(state: MatchState): MatchState {
  const { receiverId, receiverCourt } = resolveReceiver(state)
  return {
    ...state,
    receiverId,
    receiverCourt,
  }
}

/** Snapshot used by the live serve strip / scoreboard. */
export function getServeInfo(state: MatchState): ServeInfo {
  const servingSide = getServingSide(state)
  const receivingSide = getReceivingSide(state)
  const synced = syncServeReceive(state)
  return {
    serverId: synced.serverId,
    receiverId: synced.receiverId,
    receiverCourt: synced.receiverCourt,
    servingSide,
    receivingSide,
    isTiebreak: isInTiebreak(state),
    isSecondServe: state.isSecondServe,
    nextServeLabel: `${synced.serverId} serves to ${synced.receiverId}`,
  }
}

/** Rotate to the next player in `serveOrder` after a completed game (or TB switch). */
export function advanceServerAfterGame(state: MatchState): MatchState {
  const nextIndex = (state.serveOrderIndex + 1) % state.serveOrder.length
  const nextServerId = state.serveOrder[nextIndex]
  return syncServeReceive({
    ...state,
    serveOrderIndex: nextIndex,
    serverId: nextServerId,
    isSecondServe: false,
  })
}

/**
 * Tiebreak serve: first server serves 1 point, then alternate every 2 points.
 * After each server's turn (except the very first single point), advance serve order.
 */
export function advanceServerAfterTiebreakPoint(state: MatchState): MatchState {
  const pointsPlayed = state.tiebreakPointsPlayed
  // After point N is completed, pointsPlayed becomes N. Decide who serves next.
  // Point 0 (first): initial server — already set.
  // After 1 point: switch once.
  // After that: switch every 2 points (when pointsPlayed is odd: 1,3,5...)
  const shouldSwitch = pointsPlayed === 1 || (pointsPlayed > 1 && pointsPlayed % 2 === 1)
  if (!shouldSwitch) {
    return syncServeReceive({ ...state, isSecondServe: false })
  }
  return advanceServerAfterGame({ ...state, isSecondServe: false })
}

export function startTiebreak(state: MatchState): MatchState {
  // The player/team due to serve next starts the TB (already advanced if coming from 6-6 game win path).
  // When games reach 6-6, we should NOT have advanced server yet from the 12th game —
  // the next server in rotation serves first in TB.
  const next = advanceServerAfterGame(state)
  return syncServeReceive({
    ...next,
    sets: state.sets.map((set, i) =>
      i === state.sets.length - 1
        ? { ...set, isTiebreak: true, tiebreakPointsA: 0, tiebreakPointsB: 0 }
        : set,
    ),
    currentGame: { pointsA: 0, pointsB: 0 },
    tiebreakPointsPlayed: 0,
    isSecondServe: false,
  })
}

/** At start of a new set: server is next in rotation after who would have served. */
export function startNewSet(state: MatchState): MatchState {
  // Continue serve rotation; next server already set if we advanced after last game of set.
  // For set breaks we advance once from the last game of previous set.
  return syncServeReceive({
    ...state,
    sets: [
      ...state.sets,
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
    setFirstServerId: state.serverId,
    gamesCompletedInSet: 0,
    tiebreakPointsPlayed: 0,
    isSecondServe: false,
  })
}
