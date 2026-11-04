/**
 * Changeover / set-break helpers.
 * Change ends after odd games in a set, and every 6 points in a tiebreak.
 */
import { isInTiebreak, totalPointsInGame } from './serve'
import type { MatchState } from './types'

/** Whether ends should change *given the current completed-game / TB point totals*. */
export function isChangeover(state: MatchState): boolean {
  if (state.isComplete) return false
  if (isInTiebreak(state)) {
    const pts = totalPointsInGame(state)
    return pts > 0 && pts % 6 === 0
  }
  // After a completed game: gamesCompletedInSet is odd → changeover
  return state.gamesCompletedInSet > 0 && state.gamesCompletedInSet % 2 === 1
}

export function isSetBreak(state: MatchState): boolean {
  return state.pendingOverlay === 'set_break'
}

export function shouldChangeoverAfterGame(gamesCompletedInSet: number): boolean {
  return gamesCompletedInSet > 0 && gamesCompletedInSet % 2 === 1
}

export function shouldChangeoverInTiebreak(pointsPlayed: number): boolean {
  return pointsPlayed > 0 && pointsPlayed % 6 === 0
}
