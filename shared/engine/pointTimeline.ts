import { gameWinner } from './helpers'
import { isFinalSetIndex, tiebreakTargetForSet, usesTiebreak } from './rules'
import type { MatchState, PointEvent, Side } from './types'

/** Scoring context before each recorded point; shared by all statistics views. */
export function pointTimeline(state: MatchState) {
  let setIndex = -1,
    gamesA = 0,
    gamesB = 0,
    pointsA = 0,
    pointsB = 0
  const rows: {
    event: PointEvent
    gamesA: number
    gamesB: number
    pointsA: number
    pointsB: number
    inTiebreak: boolean
    isFinalSet: boolean
    target: number
    gameWinner: Side | null
    setWinner: Side | null
  }[] = []
  for (const event of state.events) {
    if (event.setIndex !== setIndex) {
      setIndex = event.setIndex
      gamesA = gamesB = pointsA = pointsB = 0
    }
    const inTiebreak = gamesA === 6 && gamesB === 6 && usesTiebreak(state.config, setIndex)
    const target = tiebreakTargetForSet(state.config, setIndex)
    const row = {
      event,
      gamesA,
      gamesB,
      pointsA,
      pointsB,
      inTiebreak,
      isFinalSet: isFinalSetIndex(state.config, setIndex),
      target,
      gameWinner: null as Side | null,
      setWinner: null as Side | null,
    }
    if (event.winnerSide === 'a') pointsA++
    else pointsB++
    row.gameWinner = inTiebreak
      ? pointsA >= target && pointsA >= pointsB + 2
        ? 'a'
        : pointsB >= target && pointsB >= pointsA + 2
          ? 'b'
          : null
      : gameWinner(pointsA, pointsB, !!state.config.noAdScoring)
    if (row.gameWinner) {
      if (row.gameWinner === 'a') gamesA++
      else gamesB++
      row.setWinner = inTiebreak
        ? row.gameWinner
        : gamesA >= 6 && gamesA >= gamesB + 2
          ? 'a'
          : gamesB >= 6 && gamesB >= gamesA + 2
            ? 'b'
            : null
      pointsA = pointsB = 0
    }
    rows.push(row)
  }
  return rows
}
