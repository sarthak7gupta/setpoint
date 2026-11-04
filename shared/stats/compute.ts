/**
 * Aggregate `PointEvent`s into per-player and per-side tennis stats.
 * @see docs/STATS.md
 */
import { sideOfPlayer } from '../engine/helpers'
import { pointTimeline } from '../engine/pointTimeline'
import { simultaneousGamePoints } from '../engine/pressure'
import type { MatchState, PointEvent, Side } from '../engine/types'
import { formatFraction, percent } from './format'

export { formatFraction } from './format'

/** Raw counters for one player (ratios computed by callers / side rollup). */
export interface PlayerStats {
  playerId: string
  winners: number
  unforcedErrors: number
  aces: number
  doubleFaults: number
  firstServeAttempts: number
  firstServesIn: number
  firstServePointsWon: number
  firstServePointsTotal: number
  secondServePointsWon: number
  secondServePointsTotal: number
  breakPointsFaced: number
  breakPointsSaved: number
  breakPointsPlayed: number
  breakPointsWon: number
  serviceGamesWon: number
  serviceGamesTotal: number
  returnGamesWon: number
  returnGamesTotal: number
  firstReturnPointsWon: number
  firstReturnPointsTotal: number
  secondReturnPointsWon: number
  secondReturnPointsTotal: number
  pressurePointsWon: number
  pressurePointsTotal: number
  servicePointsWon: number
  servicePointsTotal: number
  returnPointsWon: number
  returnPointsTotal: number
  totalPointsWon: number
  maxPointsInARow: number
  totalGamesWon: number
  maxGamesInARow: number
  /** Completed sets where this side was exactly 2 points from the set but lost it. */
  setsTwoPointsAwayLost: number
  /** Service games where this player had game point but lost the game. */
  gamePointsMissedOnServe: number
  /** Return games where this player had break point but lost the game. */
  breakPointsMissedOnReturn: number
}

/** Side-level summary; ratio fields use `won/total (pct%)` via `formatFraction`. */
export interface SideStats {
  side: Side
  winners: number
  unforcedErrors: number
  aces: number
  doubleFaults: number
  firstServeInPct: number | null
  firstServeWinPct: number | null
  secondServeWinPct: number | null
  acePct: number | null
  doubleFaultPct: number | null
  breakPointsSaved: string
  breakPointsWon: string
  serviceGamesWon: string
  returnGamesWon: string
  firstReturnWinPct: number | null
  secondReturnWinPct: number | null
  pressurePointsWon: string
  servicePointsWon: string
  returnPointsWon: string
  totalPointsWon: number
  maxPointsInARow: number
  totalGamesWon: number
  maxGamesInARow: number
  setsTwoPointsAwayLost: number
  gamePointsMissedOnServe: number
  breakPointsMissedOnReturn: number
}

function emptyPlayerStats(playerId: string): PlayerStats {
  return {
    playerId,
    winners: 0,
    unforcedErrors: 0,
    aces: 0,
    doubleFaults: 0,
    firstServeAttempts: 0,
    firstServesIn: 0,
    firstServePointsWon: 0,
    firstServePointsTotal: 0,
    secondServePointsWon: 0,
    secondServePointsTotal: 0,
    breakPointsFaced: 0,
    breakPointsSaved: 0,
    breakPointsPlayed: 0,
    breakPointsWon: 0,
    serviceGamesWon: 0,
    serviceGamesTotal: 0,
    returnGamesWon: 0,
    returnGamesTotal: 0,
    firstReturnPointsWon: 0,
    firstReturnPointsTotal: 0,
    secondReturnPointsWon: 0,
    secondReturnPointsTotal: 0,
    pressurePointsWon: 0,
    pressurePointsTotal: 0,
    servicePointsWon: 0,
    servicePointsTotal: 0,
    returnPointsWon: 0,
    returnPointsTotal: 0,
    totalPointsWon: 0,
    maxPointsInARow: 0,
    totalGamesWon: 0,
    maxGamesInARow: 0,
    setsTwoPointsAwayLost: 0,
    gamePointsMissedOnServe: 0,
    breakPointsMissedOnReturn: 0,
  }
}

/** 30–0 / 30–15 / 30–30 / deuce: need exactly two points to close the game (not already GP). */
function needsExactlyTwoPointsToWinGame(mine: number, theirs: number, noAd: boolean): boolean {
  if (simultaneousGamePoints(mine, theirs, noAd) > 0) return false
  if (mine >= 3 && theirs >= 3 && mine === theirs) return true
  return mine === 2 && theirs <= 2
}

/** Tiebreak: winning the next two points would win the TB, but one point would not. */
function needsExactlyTwoPointsInTb(mine: number, theirs: number, target: number): boolean {
  const oneWins = mine + 1 >= target && mine + 1 >= theirs + 2
  const twoWins = mine + 2 >= target && mine + 2 >= theirs + 2
  return twoWins && !oneWins
}

function winningThisGameWinsSet(gamesMine: number, gamesTheirs: number): boolean {
  return gamesMine >= 5 && gamesMine > gamesTheirs
}

function isTwoPointsFromSet(args: {
  gamesMine: number
  gamesTheirs: number
  pointsMine: number
  pointsTheirs: number
  inTb: boolean
  tbTarget: number
  noAd: boolean
}): boolean {
  const { gamesMine, gamesTheirs, pointsMine, pointsTheirs, inTb, tbTarget, noAd } = args
  if (inTb) {
    return needsExactlyTwoPointsInTb(pointsMine, pointsTheirs, tbTarget)
  }
  if (!winningThisGameWinsSet(gamesMine, gamesTheirs)) return false
  return needsExactlyTwoPointsToWinGame(pointsMine, pointsTheirs, noAd)
}

function isPressure(e: PointEvent): boolean {
  return e.isBreakPoint || e.isGamePoint || e.isSetPoint || e.isMatchPoint
}

/**
 * Walk all point events and accumulate serve, return, pressure, and attribution stats.
 * Game-level service/return win rates are filled by `computeGameStats`.
 */
export function computePlayerStats(state: MatchState): PlayerStats[] {
  const map = new Map<string, PlayerStats>()
  for (const id of state.config.playerIds) {
    map.set(id, emptyPlayerStats(id))
  }

  let streakSide: Side | null = null
  let streakLen = 0
  const sideStreakMax: Record<Side, number> = { a: 0, b: 0 }
  const sidePoints: Record<Side, number> = { a: 0, b: 0 }

  for (const e of state.events) {
    const serverSide = sideOfPlayer(state.config, e.serverId)
    const receiverSide = serverSide === 'a' ? 'b' : 'a'
    const serverStats = map.get(e.serverId)!
    const receiverStats = map.get(e.receiverId)!

    // Serve attempts: every point starts with a first serve; fault tracked via hadFirstServeFault
    serverStats.firstServeAttempts += 1
    if (!e.hadFirstServeFault) {
      serverStats.firstServesIn += 1
      serverStats.firstServePointsTotal += 1
      if (e.winnerSide === serverSide) serverStats.firstServePointsWon += 1
      receiverStats.firstReturnPointsTotal += 1
      if (e.winnerSide === receiverSide) receiverStats.firstReturnPointsWon += 1
    } else {
      serverStats.secondServePointsTotal += 1
      if (e.winnerSide === serverSide) serverStats.secondServePointsWon += 1
      receiverStats.secondReturnPointsTotal += 1
      if (e.winnerSide === receiverSide) receiverStats.secondReturnPointsWon += 1
    }

    if (e.outcome === 'double_fault') {
      serverStats.doubleFaults += 1
    }
    if (e.outcome === 'ace') {
      serverStats.aces += 1
    }

    // Attribution for winners / UEs
    const attributed =
      e.attributedPlayerId && map.has(e.attributedPlayerId)
        ? e.attributedPlayerId
        : e.winnerSide === serverSide
          ? e.serverId
          : e.receiverId

    const winnerStats =
      map.get(attributed) ??
      map.get(
        e.winnerSide === 'a'
          ? state.config.playerIds[0]
          : state.config.playerIds[state.config.format === 'singles' ? 1 : 2],
      )!

    if (e.outcome === 'winner') winnerStats.winners += 1
    if (e.outcome === 'unforced_error') {
      // UE credited to the losing attributed player if provided, else opposing default
      const loserId =
        e.attributedPlayerId && map.has(e.attributedPlayerId)
          ? e.attributedPlayerId
          : e.winnerSide === serverSide
            ? e.receiverId
            : e.serverId
      map.get(loserId)!.unforcedErrors += 1
    }

    // Service / return points
    serverStats.servicePointsTotal += 1
    if (e.winnerSide === serverSide) serverStats.servicePointsWon += 1
    receiverStats.returnPointsTotal += 1
    if (e.winnerSide === receiverSide) receiverStats.returnPointsWon += 1

    // Break points
    if (e.isBreakPoint) {
      serverStats.breakPointsFaced += 1
      receiverStats.breakPointsPlayed += 1
      if (e.winnerSide === serverSide) serverStats.breakPointsSaved += 1
      if (e.winnerSide === receiverSide) receiverStats.breakPointsWon += 1
    }

    if (isPressure(e)) {
      const forServer = map.get(e.serverId)!
      const forReceiver = map.get(e.receiverId)!
      forServer.pressurePointsTotal += 1
      forReceiver.pressurePointsTotal += 1
      if (e.winnerSide === serverSide) forServer.pressurePointsWon += 1
      if (e.winnerSide === receiverSide) forReceiver.pressurePointsWon += 1
    }

    sidePoints[e.winnerSide] += 1
    if (streakSide === e.winnerSide) {
      streakLen += 1
    } else {
      streakSide = e.winnerSide
      streakLen = 1
    }
    sideStreakMax[e.winnerSide] = Math.max(sideStreakMax[e.winnerSide], streakLen)
  }

  // Assign point totals / streaks to players on each side
  for (const id of state.config.playerIds) {
    const s = map.get(id)!
    const side = sideOfPlayer(state.config, id)
    s.totalPointsWon = sidePoints[side]
    s.maxPointsInARow = sideStreakMax[side]
  }

  // Games won from completed sets + infer service/return games from events grouping
  computeGameStats(state, map)

  return state.config.playerIds.map((id) => map.get(id)!)
}

function computeGameStats(state: MatchState, map: Map<string, PlayerStats>): void {
  let gamePoints: PointEvent[] = []
  let gameStreakSide: Side | null = null
  let gameStreak = 0
  const gameStreakMax: Record<Side, number> = { a: 0, b: 0 }
  const gamesWon: Record<Side, number> = { a: 0, b: 0 }
  const noAd = Boolean(state.config.noAdScoring)
  /** Per setIndex: side reached exactly two points from winning the set. */
  const twoPtsFromSet: Record<number, { a: boolean; b: boolean }> = {}

  const bumpSidePlayers = (side: Side, fn: (stats: PlayerStats) => void) => {
    for (const id of state.config.playerIds) {
      if (sideOfPlayer(state.config, id) === side) fn(map.get(id)!)
    }
  }

  const markTwoPtsFromSet = (setIndex: number, side: Side) => {
    const entry = twoPtsFromSet[setIndex] ?? { a: false, b: false }
    entry[side] = true
    twoPtsFromSet[setIndex] = entry
  }

  const finishSetIfNeeded = (setIndex: number, winner: Side | null) => {
    if (!winner) return
    const reached = twoPtsFromSet[setIndex]
    if (!reached) return
    if (reached.a && winner !== 'a') {
      bumpSidePlayers('a', (s) => {
        s.setsTwoPointsAwayLost += 1
      })
    }
    if (reached.b && winner !== 'b') {
      bumpSidePlayers('b', (s) => {
        s.setsTwoPointsAwayLost += 1
      })
    }
  }

  const finishGame = (points: PointEvent[], isTiebreak: boolean) => {
    if (points.length === 0) return
    const last = points[points.length - 1]
    const winner = last.winnerSide
    gamesWon[winner] += 1
    if (gameStreakSide === winner) gameStreak += 1
    else {
      gameStreakSide = winner
      gameStreak = 1
    }
    gameStreakMax[winner] = Math.max(gameStreakMax[winner], gameStreak)

    const serverId = points[0].serverId
    const serverSide = sideOfPlayer(state.config, serverId)
    const serverStats = map.get(serverId)!
    serverStats.serviceGamesTotal += 1
    if (winner === serverSide) serverStats.serviceGamesWon += 1

    const receiverId = points[0].receiverId
    const receiverStats = map.get(receiverId)!
    receiverStats.returnGamesTotal += 1
    if (winner !== serverSide) receiverStats.returnGamesWon += 1

    if (!isTiebreak) {
      const serverHadGamePoint = points.some((e) => e.isGamePoint && !e.isBreakPoint)
      const receiverHadBreakPoint = points.some((e) => e.isBreakPoint)
      if (serverHadGamePoint && winner !== serverSide) {
        serverStats.gamePointsMissedOnServe += 1
      }
      if (receiverHadBreakPoint && winner === serverSide) {
        receiverStats.breakPointsMissedOnReturn += 1
      }
    }
  }

  for (const row of pointTimeline(state)) {
    const { event, inTiebreak, gamesA, gamesB, pointsA, pointsB, target } = row
    for (const side of ['a', 'b'] as const) {
      if (
        isTwoPointsFromSet({
          gamesMine: side === 'a' ? gamesA : gamesB,
          gamesTheirs: side === 'a' ? gamesB : gamesA,
          pointsMine: side === 'a' ? pointsA : pointsB,
          pointsTheirs: side === 'a' ? pointsB : pointsA,
          inTb: inTiebreak,
          tbTarget: target,
          noAd,
        })
      )
        markTwoPtsFromSet(event.setIndex, side)
    }
    gamePoints.push(event)
    if (row.gameWinner) {
      finishGame(gamePoints, inTiebreak)
      gamePoints = []
    }
    finishSetIfNeeded(event.setIndex, row.setWinner)
  }

  for (const id of state.config.playerIds) {
    const s = map.get(id)!
    const side = sideOfPlayer(state.config, id)
    s.totalGamesWon = gamesWon[side]
    s.maxGamesInARow = gameStreakMax[side]
  }
}

export function computeSideStats(state: MatchState): SideStats[] {
  const players = computePlayerStats(state)

  const aggregate = (side: Side): SideStats => {
    const ids =
      state.config.format === 'singles'
        ? [state.config.playerIds[side === 'a' ? 0 : 1]]
        : side === 'a'
          ? [state.config.playerIds[0], state.config.playerIds[1]]
          : [state.config.playerIds[2], state.config.playerIds[3]]

    const list = players.filter((p) => ids.includes(p.playerId))
    const sum = (fn: (p: PlayerStats) => number) => list.reduce((a, p) => a + fn(p), 0)

    const firstServeAttempts = sum((p) => p.firstServeAttempts)
    const firstServesIn = sum((p) => p.firstServesIn)
    const firstServePointsWon = sum((p) => p.firstServePointsWon)
    const firstServePointsTotal = sum((p) => p.firstServePointsTotal)
    const secondServePointsWon = sum((p) => p.secondServePointsWon)
    const secondServePointsTotal = sum((p) => p.secondServePointsTotal)
    const aces = sum((p) => p.aces)
    const dfs = sum((p) => p.doubleFaults)
    const bpFaced = sum((p) => p.breakPointsFaced)
    const bpSaved = sum((p) => p.breakPointsSaved)
    const bpPlayed = sum((p) => p.breakPointsPlayed)
    const bpWon = sum((p) => p.breakPointsWon)

    return {
      side,
      winners: sum((p) => p.winners),
      unforcedErrors: sum((p) => p.unforcedErrors),
      aces,
      doubleFaults: dfs,
      firstServeInPct: percent(firstServesIn, firstServeAttempts),
      firstServeWinPct: percent(firstServePointsWon, firstServePointsTotal),
      secondServeWinPct: percent(secondServePointsWon, secondServePointsTotal),
      acePct: percent(aces, firstServeAttempts),
      doubleFaultPct: percent(dfs, firstServeAttempts),
      breakPointsSaved: formatFraction(bpSaved, bpFaced),
      breakPointsWon: formatFraction(bpWon, bpPlayed),
      serviceGamesWon: formatFraction(
        sum((p) => p.serviceGamesWon),
        sum((p) => p.serviceGamesTotal),
      ),
      returnGamesWon: formatFraction(
        sum((p) => p.returnGamesWon),
        sum((p) => p.returnGamesTotal),
      ),
      firstReturnWinPct: percent(
        sum((p) => p.firstReturnPointsWon),
        sum((p) => p.firstReturnPointsTotal),
      ),
      secondReturnWinPct: percent(
        sum((p) => p.secondReturnPointsWon),
        sum((p) => p.secondReturnPointsTotal),
      ),
      pressurePointsWon: formatFraction(
        sum((p) => p.pressurePointsWon),
        sum((p) => p.pressurePointsTotal),
      ),
      servicePointsWon: formatFraction(
        sum((p) => p.servicePointsWon),
        sum((p) => p.servicePointsTotal),
      ),
      returnPointsWon: formatFraction(
        sum((p) => p.returnPointsWon),
        sum((p) => p.returnPointsTotal),
      ),
      totalPointsWon: sum((p) => p.totalPointsWon) / (state.config.format === 'doubles' ? 2 : 1),
      maxPointsInARow: Math.max(...list.map((p) => p.maxPointsInARow), 0),
      totalGamesWon: sum((p) => p.totalGamesWon) / (state.config.format === 'doubles' ? 2 : 1),
      maxGamesInARow: Math.max(...list.map((p) => p.maxGamesInARow), 0),
      setsTwoPointsAwayLost:
        sum((p) => p.setsTwoPointsAwayLost) / (state.config.format === 'doubles' ? 2 : 1),
      gamePointsMissedOnServe: sum((p) => p.gamePointsMissedOnServe),
      breakPointsMissedOnReturn: sum((p) => p.breakPointsMissedOnReturn),
    }
  }

  return [aggregate('a'), aggregate('b')]
}

export type { PointSlice, SliceDisplay, StatSituation } from './slices'
export {
  addPointSlices,
  computePlayerSlice,
  computeSideSlice,
  computeSideSlices,
  displayPointSlice,
  emptyPointSlice,
  STAT_SITUATIONS,
  tagEvents,
} from './slices'
