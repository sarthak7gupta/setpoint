/**
 * Live pressure callouts: break / game / set / match points,
 * simultaneous counts ("3 break points"), ordinals ("Match point #2"),
 * and love-all "Serving for / to stay in the set/match" on a clinching service game.
 * @see docs/ENGINE.md
 */
import { oppositeSide, setsToWin } from './helpers'
import { tiebreakTargetForSet } from './rules'
import { getServingSide, isInTiebreak } from './serve'
import type { MatchConfig, MatchState, PointEvent, Side } from './types'

export type PressureKind = 'break' | 'game' | 'set' | 'match' | 'deuce'

export interface PressureSituation {
  /** Side that wins the game/set/match if they take this point (server at deuce). */
  benefitingSide: Side
  servingSide: Side
  receivingSide: Side
  isBreakPoint: boolean
  isGamePoint: boolean
  isSetPoint: boolean
  isMatchPoint: boolean
  isDeuce: boolean
  /** How many chances exist right now (e.g. 0–40 → 3). */
  simultaneous: number
  breakOrdinal: number
  gameOrdinal: number
  setOrdinal: number
  matchOrdinal: number
  /** 1 = first deuce this service game, 2+ after returns from ad. */
  deuceOrdinal: number
  /** Highest-severity kind for styling. */
  primaryKind: PressureKind
  /** Display lines, highest priority first. */
  labels: string[]
}

function neededSets(config: MatchConfig): number {
  return setsToWin(config.bestOf)
}

function countSetsWon(state: MatchState, side: Side): number {
  return state.sets.filter((s) => s.completed && s.winner === side).length
}

function tiebreakTarget(state: MatchState): number {
  return tiebreakTargetForSet(state.config, state.sets.length - 1)
}

/**
 * Simultaneous game/break points from raw point counts.
 * 40–0 → 3, 40–15 → 2, 40–30 → 1, AD → 1, else 0.
 * No-ad at 40–40 → 1 (deciding point).
 */
export function simultaneousGamePoints(mine: number, theirs: number, noAd = false): number {
  if (mine >= 3 && theirs >= 3) {
    if (noAd && mine === theirs) return 1
    return mine === theirs + 1 ? 1 : 0
  }
  if (mine === 3 && theirs < 3) return 3 - theirs
  return 0
}

/**
 * True if winning the next point wins the game (or TB).
 * Tiebreak: must win by 2, so 6–6 is NOT a set/game point; 7–6 is.
 */
export function gamePointForSide(state: MatchState, side: Side): boolean {
  if (isInTiebreak(state)) {
    const set = state.sets[state.sets.length - 1]
    const mine = side === 'a' ? set.tiebreakPointsA : set.tiebreakPointsB
    const theirs = side === 'a' ? set.tiebreakPointsB : set.tiebreakPointsA
    const target = tiebreakTarget(state)
    // After this point: mine+1 >= target AND mine+1 >= theirs+2
    return mine >= target - 1 && mine >= theirs + 1
  }
  const mine = side === 'a' ? state.currentGame.pointsA : state.currentGame.pointsB
  const theirs = side === 'a' ? state.currentGame.pointsB : state.currentGame.pointsA
  return simultaneousGamePoints(mine, theirs, Boolean(state.config.noAdScoring)) > 0
}

function simultaneousForSide(state: MatchState, side: Side): number {
  if (isInTiebreak(state)) {
    return gamePointForSide(state, side) ? 1 : 0
  }
  const mine = side === 'a' ? state.currentGame.pointsA : state.currentGame.pointsB
  const theirs = side === 'a' ? state.currentGame.pointsB : state.currentGame.pointsA
  return simultaneousGamePoints(mine, theirs, Boolean(state.config.noAdScoring))
}

/**
 * True if winning the current game (not just this point) would clinch the set.
 * Advantage final set at 6–6: no — still need a 2-game lead.
 */
export function winningThisGameWinsSet(state: MatchState, side: Side): boolean {
  if (isInTiebreak(state)) return false
  const set = state.sets[state.sets.length - 1]
  const games = side === 'a' ? set.gamesA : set.gamesB
  const other = side === 'a' ? set.gamesB : set.gamesA
  return games >= 5 && games > other
}

function winningThisGameWinsMatch(state: MatchState, side: Side): boolean {
  return (
    winningThisGameWinsSet(state, side) && countSetsWon(state, side) + 1 >= neededSets(state.config)
  )
}

function isLoveAll(state: MatchState): boolean {
  return !isInTiebreak(state) && state.currentGame.pointsA === 0 && state.currentGame.pointsB === 0
}

/**
 * Game point that also clinches the set.
 * Advantage final set at 6–6: game point is NOT set point (need a 2-game lead).
 * Tiebreak: any TB game point is a set point (TB itself decides the set).
 */
export function setPointForSide(state: MatchState, side: Side): boolean {
  if (!gamePointForSide(state, side)) return false
  if (isInTiebreak(state)) return true
  return winningThisGameWinsSet(state, side)
}

export function matchPointForSide(state: MatchState, side: Side): boolean {
  if (!setPointForSide(state, side)) return false
  return countSetsWon(state, side) + 1 >= neededSets(state.config)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function pluralize(noun: string, n: number): string {
  return n === 1 ? noun : `${noun}s`
}

function countNoun(kind: Exclude<PressureKind, 'deuce'>): string {
  return kind === 'break'
    ? 'break point'
    : kind === 'game'
      ? 'game point'
      : kind === 'set'
        ? 'set point'
        : 'match point'
}

/** Count / ordinal wording: "3 break points", "Match point #2", "Game point". */
export function formatCountLabel(args: {
  kind: Exclude<PressureKind, 'deuce'>
  simultaneous: number
  ordinal: number
}): string {
  const { kind, simultaneous, ordinal } = args
  const noun = countNoun(kind)

  // After the first cluster of chances, leftover simultaneous points use the ordinal
  // ("Break point #2") rather than "2 break points".
  if (ordinal > 1) {
    return `${capitalize(noun)} #${ordinal}`
  }
  if (simultaneous > 1) {
    return `${simultaneous} ${pluralize(noun, simultaneous)}`
  }
  return capitalize(noun)
}

/** `Deuce` on first visit this game; `Deuce #2` after returning from advantage. */
export function formatDeuceLabel(ordinal: number): string {
  return ordinal > 1 ? `Deuce #${ordinal}` : 'Deuce'
}

function loveAllServingLabel(args: { forMatch: boolean; staying: boolean }): string {
  const stake = args.forMatch ? 'match' : 'set'
  return args.staying ? `Serving to stay in the ${stake}` : `Serving for the ${stake}`
}

function loveAllServingSituation(args: {
  servingSide: Side
  receivingSide: Side
  forMatch: boolean
  staying: boolean
}): PressureSituation {
  const { servingSide, receivingSide, forMatch, staying } = args
  return {
    benefitingSide: staying ? receivingSide : servingSide,
    servingSide,
    receivingSide,
    isBreakPoint: false,
    isGamePoint: false,
    isSetPoint: false,
    isMatchPoint: false,
    isDeuce: false,
    simultaneous: 0,
    breakOrdinal: 0,
    gameOrdinal: 0,
    setOrdinal: 0,
    matchOrdinal: 0,
    deuceOrdinal: 0,
    primaryKind: forMatch ? 'match' : 'set',
    labels: [loveAllServingLabel({ forMatch, staying })],
  }
}

/**
 * In-game callouts: counts and ordinals only.
 * Love-all serving-for / serving-to-stay lines live in getPressureSituation.
 */
export function formatPressureLabel(args: {
  kind: Exclude<PressureKind, 'deuce'>
  simultaneous: number
  ordinal: number
  serverHasIt: boolean
}): string {
  return formatCountLabel({
    kind: args.kind,
    simultaneous: args.simultaneous,
    ordinal: args.ordinal,
  })
}

/** Events in the current service game (same set + same server, trailing). */
function eventsInCurrentServiceGame(state: MatchState): PointEvent[] {
  const setIndex = state.sets.length - 1
  const { serverId } = state
  const out: PointEvent[] = []
  for (let i = state.events.length - 1; i >= 0; i--) {
    const e = state.events[i]
    if (e.setIndex !== setIndex) break
    if (e.serverId !== serverId) break
    out.push(e)
  }
  return out.reverse()
}

function pastFlagCountInCurrentGame(
  state: MatchState,
  flag: 'isBreakPoint' | 'isGamePoint' | 'isSetPoint' | 'isMatchPoint',
): number {
  return eventsInCurrentServiceGame(state).filter((e) => e[flag]).length
}

/**
 * Prior chances in this service game that belonged to `side`.
 * Break-point events always belong to the receiver; other pressure flags
 * belong to the server. That way 0–40 (3 break points) does not become
 * "Game point #4" when the server later reaches advantage.
 */
function pastFlagCountInCurrentGameForSide(
  state: MatchState,
  flag: 'isGamePoint' | 'isSetPoint' | 'isMatchPoint',
  side: Side,
): number {
  const servingSide = getServingSide(state)
  const receivingSide = oppositeSide(servingSide)
  return eventsInCurrentServiceGame(state).filter((e) => {
    if (!e[flag]) return false
    const eventSide = e.isBreakPoint ? receivingSide : servingSide
    return eventSide === side
  }).length
}

export function isAtDeuce(state: MatchState): boolean {
  if (isInTiebreak(state)) return false
  const { pointsA, pointsB } = state.currentGame
  return pointsA >= 3 && pointsB >= 3 && pointsA === pointsB
}

/**
 * How many times this service game has entered deuce (40–40, then again after ads).
 * Current score must already be deuce for the callout; ordinal is ≥ 1.
 */
export function deuceOrdinalInCurrentGame(state: MatchState): number {
  const events = eventsInCurrentServiceGame(state)
  let a = 0
  let b = 0
  let count = 0
  let wasDeuce = false
  for (const e of events) {
    if (e.winnerSide === 'a') a += 1
    else b += 1
    const deuce = a >= 3 && b >= 3 && a === b
    if (deuce && !wasDeuce) count += 1
    wasDeuce = deuce
  }
  return count
}

/**
 * Analyze the upcoming point for pressure. Returns null when nothing special.
 * Flags match those stamped onto the next `PointEvent` by `applyPoint`.
 */
export function getPressureSituation(state: MatchState): PressureSituation | null {
  if (state.isComplete || state.pendingOverlay === 'match_end') return null
  if (state.pendingOverlay !== 'none') return null

  const servingSide = getServingSide(state)
  const receivingSide = oppositeSide(servingSide)

  const gpServer = gamePointForSide(state, servingSide)
  const gpReceiver = gamePointForSide(state, receivingSide)

  if (!gpServer && !gpReceiver) {
    if (isLoveAll(state) && winningThisGameWinsSet(state, servingSide)) {
      return loveAllServingSituation({
        servingSide,
        receivingSide,
        forMatch: winningThisGameWinsMatch(state, servingSide),
        staying: false,
      })
    }
    if (isLoveAll(state) && winningThisGameWinsSet(state, receivingSide)) {
      return loveAllServingSituation({
        servingSide,
        receivingSide,
        forMatch: winningThisGameWinsMatch(state, receivingSide),
        staying: true,
      })
    }
    if (!isAtDeuce(state)) return null
    const deuceOrdinal = deuceOrdinalInCurrentGame(state)
    return {
      benefitingSide: servingSide,
      servingSide,
      receivingSide,
      isBreakPoint: false,
      isGamePoint: false,
      isSetPoint: false,
      isMatchPoint: false,
      isDeuce: true,
      simultaneous: 0,
      breakOrdinal: 0,
      gameOrdinal: 0,
      setOrdinal: 0,
      matchOrdinal: 0,
      deuceOrdinal,
      primaryKind: 'deuce',
      labels: [formatDeuceLabel(deuceOrdinal)],
    }
  }

  // Only one side can have game point at a time in standard scoring.
  // No-ad deuce is a deciding point: both sides have game point.
  // Tiebreaks have no service holds — never call break points there.
  const inTiebreak = isInTiebreak(state)
  const deciding = gpServer && gpReceiver && !inTiebreak
  const benefitingSide = gpReceiver ? receivingSide : servingSide
  const isBreakPoint = gpReceiver && !inTiebreak
  const isGamePoint = true
  const isSetPoint = setPointForSide(state, servingSide) || setPointForSide(state, receivingSide)
  const isMatchPoint =
    matchPointForSide(state, servingSide) || matchPointForSide(state, receivingSide)
  const simultaneous = simultaneousForSide(state, benefitingSide)
  const serverHasIt = benefitingSide === servingSide

  // Ordinals count prior chances for this side in this service game only —
  // so 0–40 is "3 break points", a save is "Break point #2", then "#3",
  // never match-wide #14, and never mixing the other side's chances.
  const breakOrdinal = isBreakPoint ? pastFlagCountInCurrentGame(state, 'isBreakPoint') + 1 : 0
  const gameOrdinal = pastFlagCountInCurrentGameForSide(state, 'isGamePoint', benefitingSide) + 1
  const setOrdinal = isSetPoint
    ? pastFlagCountInCurrentGameForSide(state, 'isSetPoint', benefitingSide) + 1
    : 0
  const matchOrdinal = isMatchPoint
    ? pastFlagCountInCurrentGameForSide(state, 'isMatchPoint', benefitingSide) + 1
    : 0

  const primaryKind: PressureKind = isMatchPoint
    ? 'match'
    : isSetPoint
      ? 'set'
      : isBreakPoint
        ? 'break'
        : 'game'

  // Callout stacking:
  //   break subsumes game (a break point is always a game point)
  //   set/match subsume game (a set/match point is always a game point)
  //   break + set/match both show (returner can break to win the set/match)
  const labels: string[] = []

  if (deciding) labels.push('Deciding point')

  if (isMatchPoint) {
    labels.push(
      formatPressureLabel({
        kind: 'match',
        simultaneous,
        ordinal: matchOrdinal,
        serverHasIt,
      }),
    )
  } else if (isSetPoint) {
    labels.push(
      formatPressureLabel({
        kind: 'set',
        simultaneous,
        ordinal: setOrdinal,
        serverHasIt,
      }),
    )
  }

  if (isBreakPoint && !deciding) {
    const breakLabel = formatPressureLabel({
      kind: 'break',
      simultaneous,
      ordinal: breakOrdinal,
      serverHasIt: false,
    })
    if (!labels.includes(breakLabel)) labels.push(breakLabel)
  } else if (!isMatchPoint && !isSetPoint && !deciding) {
    labels.push(
      formatPressureLabel({
        kind: 'game',
        simultaneous,
        ordinal: gameOrdinal,
        serverHasIt,
      }),
    )
  }

  return {
    benefitingSide,
    servingSide,
    receivingSide,
    isBreakPoint,
    isGamePoint,
    isSetPoint,
    isMatchPoint,
    isDeuce: false,
    simultaneous,
    breakOrdinal,
    gameOrdinal,
    setOrdinal,
    matchOrdinal,
    deuceOrdinal: 0,
    primaryKind,
    labels,
  }
}

/** Boolean flags stamped on each point event (situation before the ball). */
export function pressureFlagsForState(state: MatchState): {
  isBreakPoint: boolean
  isGamePoint: boolean
  isSetPoint: boolean
  isMatchPoint: boolean
} {
  const sit = getPressureSituation(state)
  if (!sit) {
    return {
      isBreakPoint: false,
      isGamePoint: false,
      isSetPoint: false,
      isMatchPoint: false,
    }
  }
  return {
    isBreakPoint: sit.isBreakPoint,
    isGamePoint: sit.isGamePoint,
    isSetPoint: sit.isSetPoint,
    isMatchPoint: sit.isMatchPoint,
  }
}
