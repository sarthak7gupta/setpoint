/**
 * Point-by-point recap grouped by set and game, with BP / SP / MP markers.
 */
import { displayPoint, gameWinner, playersOnSide, setsToWin, sideOfPlayer } from '../engine/helpers'
import type { MatchState, PointEvent, Side } from '../engine/types'

export type RecapMarker = 'BP' | 'SP' | 'MP'

export interface RecapColumn {
  scoreA: string
  scoreB: string
  winnerSide: Side
  marker: RecapMarker | null
  /** Player receiving serve on this point. */
  receiverId: string
}

export interface RecapGame {
  setIndex: number
  /** Set score after this game. */
  gamesA: number
  gamesB: number
  winner: Side
  serverId: string
  /** Receiver on the first point of the game (deuce-court starter in doubles). */
  firstReceiverId: string
  isTiebreak: boolean
  columns: RecapColumn[]
}

export interface RecapSet {
  setIndex: number
  games: RecapGame[]
}

function isFinalSetIndex(state: MatchState, setIndex: number): boolean {
  const need = setsToWin(state.config.bestOf)
  return setIndex === need * 2 - 2 || state.config.bestOf === 1
}

function tiebreakTarget(state: MatchState, setIndex: number): number {
  if (isFinalSetIndex(state, setIndex) && setIndex > 0) {
    return state.config.finalSetTiebreak
      ? state.config.finalSetTiebreakPoints
      : state.config.tiebreakPoints
  }
  return state.config.tiebreakPoints
}

function usesTiebreakAtSixAll(state: MatchState, setIndex: number): boolean {
  if (isFinalSetIndex(state, setIndex) && !state.config.finalSetTiebreak) return false
  return true
}

function tbWinner(pointsA: number, pointsB: number, target: number): Side | null {
  if (pointsA >= target && pointsA >= pointsB + 2) return 'a'
  if (pointsB >= target && pointsB >= pointsA + 2) return 'b'
  return null
}

/** One badge per column; match point outranks set point, which outranks break. */
export function recapMarker(event: PointEvent, isTiebreak: boolean): RecapMarker | null {
  if (event.isMatchPoint) return 'MP'
  if (event.isSetPoint && isTiebreak) return 'SP'
  if (event.isBreakPoint && !isTiebreak) return 'BP'
  if (event.isSetPoint) return 'SP'
  return null
}

function markerRank(marker: RecapMarker | null): number {
  if (marker === 'MP') return 3
  if (marker === 'SP') return 2
  if (marker === 'BP') return 1
  return 0
}

export function buildMatchRecap(state: MatchState): RecapSet[] {
  const sets: RecapSet[] = []
  let gamePoints: PointEvent[] = []
  let ptsA = 0
  let ptsB = 0
  let gamesA = 0
  let gamesB = 0
  let inTb = false
  let setIndex = 0

  const flushSet = () => {
    if (sets.length === 0 || sets[sets.length - 1].setIndex !== setIndex) {
      sets.push({ setIndex, games: [] })
    }
  }

  const finishGame = (points: PointEvent[], winner: Side, isTiebreak: boolean) => {
    if (points.length === 0) return
    if (winner === 'a') gamesA += 1
    else gamesB += 1
    flushSet()
    const columns: RecapColumn[] = []
    let a = 0
    let b = 0
    for (const event of points) {
      if (event.winnerSide === 'a') a += 1
      else b += 1
      columns.push({
        scoreA: isTiebreak ? String(a) : displayPoint(a, b),
        scoreB: isTiebreak ? String(b) : displayPoint(b, a),
        winnerSide: event.winnerSide,
        marker: recapMarker(event, isTiebreak),
        receiverId: event.receiverId,
      })
    }
    // Standard games: the closing point repeats 40. The footer already names the winner.
    // Keep any BP/SP/MP from that point on the last shown score.
    if (!isTiebreak && columns.length > 1) {
      const closed = columns.pop()!
      const lastShown = columns[columns.length - 1]
      if (markerRank(closed.marker) > markerRank(lastShown.marker)) {
        lastShown.marker = closed.marker
      }
    }
    sets[sets.length - 1].games.push({
      setIndex,
      gamesA,
      gamesB,
      winner,
      serverId: points[0].serverId,
      firstReceiverId: points[0].receiverId,
      isTiebreak,
      columns,
    })
  }

  const resetGame = () => {
    ptsA = 0
    ptsB = 0
    gamePoints = []
  }

  for (const event of state.events) {
    if (event.setIndex !== setIndex) {
      setIndex = event.setIndex
      gamesA = 0
      gamesB = 0
      inTb = false
      resetGame()
    }

    if (!inTb && gamesA === 6 && gamesB === 6 && usesTiebreakAtSixAll(state, setIndex)) {
      inTb = true
    }

    if (inTb) {
      if (event.winnerSide === 'a') ptsA += 1
      else ptsB += 1
      gamePoints.push(event)
      const winner = tbWinner(ptsA, ptsB, tiebreakTarget(state, setIndex))
      if (winner) {
        finishGame(gamePoints, winner, true)
        inTb = false
        resetGame()
      }
      continue
    }

    if (event.winnerSide === 'a') ptsA += 1
    else ptsB += 1
    gamePoints.push(event)
    const winner = gameWinner(ptsA, ptsB)
    if (winner) {
      finishGame(gamePoints, winner, false)
      resetGame()
    }
  }

  return sets
}

export function recapSideLabel(args: {
  state: MatchState
  side: Side
  nameOf: (id: string) => string
}): string {
  const { state, side, nameOf } = args
  const ids = playersOnSide(state.config, side)
  return ids.map((id) => abbrevName(nameOf(id))).join(' / ')
}

export function abbrevName(full: string): string {
  const parts = full.trim().split(/\s+/)
  const last = parts[parts.length - 1] ?? full
  return last.slice(0, 3).toUpperCase()
}

export function recapServerSide(state: MatchState, serverId: string): Side {
  return sideOfPlayer(state.config, serverId)
}

/** Receiving side won the game (or TB) against the first server. */
export function recapIsBreak(args: { state: MatchState; serverId: string; winner: Side }): boolean {
  return recapServerSide(args.state, args.serverId) !== args.winner
}
