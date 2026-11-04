/**
 * Situational (filtered) serve / return stats: pressure, break points, TB, etc.
 * @see docs/STATS.md
 */
import { sideOfPlayer } from '../engine/helpers'
import { pointTimeline } from '../engine/pointTimeline'
import type { MatchState, PointEvent, Side } from '../engine/types'
import { formatFraction, percent } from './format'

export const STAT_SITUATIONS = [
  'all',
  'pressure',
  'breakPointServe',
  'breakPointReturn',
  'gamePoint',
  'setPoint',
  'matchPoint',
  'tiebreak',
  'finalSet',
] as const

export type StatSituation = (typeof STAT_SITUATIONS)[number]

/** Raw counters for one player or side under a situation filter. */
export interface PointSlice {
  firstServeAttempts: number
  firstServesIn: number
  firstServePointsWon: number
  firstServePointsTotal: number
  secondServePointsWon: number
  secondServePointsTotal: number
  firstReturnPointsWon: number
  firstReturnPointsTotal: number
  secondReturnPointsWon: number
  secondReturnPointsTotal: number
  aces: number
  doubleFaults: number
  winners: number
  unforcedErrors: number
  servicePointsWon: number
  servicePointsTotal: number
  returnPointsWon: number
  returnPointsTotal: number
  pointsWon: number
  pointsTotal: number
}

export interface SliceDisplay {
  firstServeInPct: number | null
  firstServeWinPct: number | null
  secondServeWinPct: number | null
  firstReturnWinPct: number | null
  secondReturnWinPct: number | null
  aces: number
  doubleFaults: number
  winners: number
  unforcedErrors: number
  servicePointsWon: string
  returnPointsWon: string
  pointsWon: string
  samples: {
    firstServeIn: string
    firstServeWin: string
    secondServeWin: string
    firstReturnWin: string
    secondReturnWin: string
  }
}

export function emptyPointSlice(): PointSlice {
  return {
    firstServeAttempts: 0,
    firstServesIn: 0,
    firstServePointsWon: 0,
    firstServePointsTotal: 0,
    secondServePointsWon: 0,
    secondServePointsTotal: 0,
    firstReturnPointsWon: 0,
    firstReturnPointsTotal: 0,
    secondReturnPointsWon: 0,
    secondReturnPointsTotal: 0,
    aces: 0,
    doubleFaults: 0,
    winners: 0,
    unforcedErrors: 0,
    servicePointsWon: 0,
    servicePointsTotal: 0,
    returnPointsWon: 0,
    returnPointsTotal: 0,
    pointsWon: 0,
    pointsTotal: 0,
  }
}

export function addPointSlices(a: PointSlice, b: PointSlice): PointSlice {
  return {
    firstServeAttempts: a.firstServeAttempts + b.firstServeAttempts,
    firstServesIn: a.firstServesIn + b.firstServesIn,
    firstServePointsWon: a.firstServePointsWon + b.firstServePointsWon,
    firstServePointsTotal: a.firstServePointsTotal + b.firstServePointsTotal,
    secondServePointsWon: a.secondServePointsWon + b.secondServePointsWon,
    secondServePointsTotal: a.secondServePointsTotal + b.secondServePointsTotal,
    firstReturnPointsWon: a.firstReturnPointsWon + b.firstReturnPointsWon,
    firstReturnPointsTotal: a.firstReturnPointsTotal + b.firstReturnPointsTotal,
    secondReturnPointsWon: a.secondReturnPointsWon + b.secondReturnPointsWon,
    secondReturnPointsTotal: a.secondReturnPointsTotal + b.secondReturnPointsTotal,
    aces: a.aces + b.aces,
    doubleFaults: a.doubleFaults + b.doubleFaults,
    winners: a.winners + b.winners,
    unforcedErrors: a.unforcedErrors + b.unforcedErrors,
    servicePointsWon: a.servicePointsWon + b.servicePointsWon,
    servicePointsTotal: a.servicePointsTotal + b.servicePointsTotal,
    returnPointsWon: a.returnPointsWon + b.returnPointsWon,
    returnPointsTotal: a.returnPointsTotal + b.returnPointsTotal,
    pointsWon: a.pointsWon + b.pointsWon,
    pointsTotal: a.pointsTotal + b.pointsTotal,
  }
}

export function displayPointSlice(slice: PointSlice): SliceDisplay {
  return {
    samples: {
      firstServeIn: `${slice.firstServesIn}/${slice.firstServeAttempts}`,
      firstServeWin: `${slice.firstServePointsWon}/${slice.firstServePointsTotal}`,
      secondServeWin: `${slice.secondServePointsWon}/${slice.secondServePointsTotal}`,
      firstReturnWin: `${slice.firstReturnPointsWon}/${slice.firstReturnPointsTotal}`,
      secondReturnWin: `${slice.secondReturnPointsWon}/${slice.secondReturnPointsTotal}`,
    },
    firstServeInPct: percent(slice.firstServesIn, slice.firstServeAttempts),
    firstServeWinPct: percent(slice.firstServePointsWon, slice.firstServePointsTotal),
    secondServeWinPct: percent(slice.secondServePointsWon, slice.secondServePointsTotal),
    firstReturnWinPct: percent(slice.firstReturnPointsWon, slice.firstReturnPointsTotal),
    secondReturnWinPct: percent(slice.secondReturnPointsWon, slice.secondReturnPointsTotal),
    aces: slice.aces,
    doubleFaults: slice.doubleFaults,
    winners: slice.winners,
    unforcedErrors: slice.unforcedErrors,
    servicePointsWon: formatFraction(slice.servicePointsWon, slice.servicePointsTotal),
    returnPointsWon: formatFraction(slice.returnPointsWon, slice.returnPointsTotal),
    pointsWon: formatFraction(slice.pointsWon, slice.pointsTotal),
  }
}

function isPressure(e: PointEvent): boolean {
  return e.isBreakPoint || e.isGamePoint || e.isSetPoint || e.isMatchPoint
}

type TaggedEvent = ReturnType<typeof pointTimeline>[number]
export const tagEvents = pointTimeline

function includeTagged(args: {
  situation: StatSituation
  tagged: TaggedEvent
  served: boolean
  received: boolean
}): boolean {
  const { situation, tagged, served, received } = args
  const { event, inTiebreak, isFinalSet } = tagged
  switch (situation) {
    case 'all':
      return true
    case 'pressure':
      return isPressure(event)
    case 'breakPointServe':
      return event.isBreakPoint && served
    case 'breakPointReturn':
      return event.isBreakPoint && received
    case 'gamePoint':
      return event.isGamePoint
    case 'setPoint':
      return event.isSetPoint
    case 'matchPoint':
      return event.isMatchPoint
    case 'tiebreak':
      return inTiebreak
    case 'finalSet':
      return isFinalSet
  }
}

function tallyForRole(args: {
  slice: PointSlice
  event: PointEvent
  served: boolean
  received: boolean
  won: boolean
  winnerOnThis: boolean
  loserOnThis: boolean
}): void {
  const { slice, event, served, received, won, winnerOnThis, loserOnThis } = args
  slice.pointsTotal += 1
  if (won) slice.pointsWon += 1

  if (served) {
    slice.firstServeAttempts += 1
    slice.servicePointsTotal += 1
    if (won) slice.servicePointsWon += 1
    if (!event.hadFirstServeFault) {
      slice.firstServesIn += 1
      slice.firstServePointsTotal += 1
      if (won) slice.firstServePointsWon += 1
    } else {
      slice.secondServePointsTotal += 1
      if (won) slice.secondServePointsWon += 1
    }
    if (event.outcome === 'ace') slice.aces += 1
    if (event.outcome === 'double_fault') slice.doubleFaults += 1
  }

  if (received) {
    slice.returnPointsTotal += 1
    if (won) slice.returnPointsWon += 1
    if (!event.hadFirstServeFault) {
      slice.firstReturnPointsTotal += 1
      if (won) slice.firstReturnPointsWon += 1
    } else {
      slice.secondReturnPointsTotal += 1
      if (won) slice.secondReturnPointsWon += 1
    }
  }

  if (event.outcome === 'winner' && winnerOnThis) slice.winners += 1
  if (event.outcome === 'unforced_error' && loserOnThis) slice.unforcedErrors += 1
}

function defaultWinnerId(event: PointEvent, servingSide: Side): string {
  return event.winnerSide === servingSide ? event.serverId : event.receiverId
}

function defaultLoserId(event: PointEvent, servingSide: Side): string {
  return event.winnerSide === servingSide ? event.receiverId : event.serverId
}

export function computePlayerSlice(args: {
  state: MatchState
  playerId: string
  situation: StatSituation
}): PointSlice {
  const { state, playerId, situation } = args
  const slice = emptyPointSlice()
  for (const tagged of tagEvents(state)) {
    const { event } = tagged
    const servingSide = sideOfPlayer(state.config, event.serverId)
    const served = event.serverId === playerId
    const received = event.receiverId === playerId
    // A doubles partner can hit the shot without serving or receiving.
    if (!state.config.playerIds.includes(playerId)) continue
    if (!includeTagged({ situation, tagged, served, received })) continue

    const attributedWinner =
      event.attributedPlayerId && state.config.playerIds.includes(event.attributedPlayerId)
        ? event.attributedPlayerId
        : defaultWinnerId(event, servingSide)
    const attributedLoser =
      event.outcome === 'unforced_error'
        ? event.attributedPlayerId && state.config.playerIds.includes(event.attributedPlayerId)
          ? event.attributedPlayerId
          : defaultLoserId(event, servingSide)
        : null

    tallyForRole({
      slice,
      event,
      served,
      received,
      won: event.winnerSide === sideOfPlayer(state.config, playerId),
      winnerOnThis: attributedWinner === playerId,
      loserOnThis: attributedLoser === playerId,
    })
  }
  return slice
}

export function computeSideSlice(args: {
  state: MatchState
  side: Side
  situation: StatSituation
}): PointSlice {
  const { state, side, situation } = args
  const slice = emptyPointSlice()
  for (const tagged of tagEvents(state)) {
    const { event } = tagged
    const servingSide = sideOfPlayer(state.config, event.serverId)
    const receivingSide = servingSide === 'a' ? 'b' : 'a'
    const served = servingSide === side
    const received = receivingSide === side
    if (!includeTagged({ situation, tagged, served, received })) continue

    const attributedWinner =
      event.attributedPlayerId && state.config.playerIds.includes(event.attributedPlayerId)
        ? event.attributedPlayerId
        : defaultWinnerId(event, servingSide)
    const attributedLoser =
      event.outcome === 'unforced_error'
        ? event.attributedPlayerId && state.config.playerIds.includes(event.attributedPlayerId)
          ? event.attributedPlayerId
          : defaultLoserId(event, servingSide)
        : null

    tallyForRole({
      slice,
      event,
      served,
      received,
      won: event.winnerSide === side,
      winnerOnThis: sideOfPlayer(state.config, attributedWinner) === side,
      loserOnThis: attributedLoser != null && sideOfPlayer(state.config, attributedLoser) === side,
    })
  }
  return slice
}

export function computeSideSlices(
  state: MatchState,
  situation: StatSituation,
): { side: Side; slice: PointSlice; display: SliceDisplay }[] {
  return (['a', 'b'] as const).map((side) => {
    const slice = computeSideSlice({ state, side, situation })
    return { side, slice, display: displayPointSlice(slice) }
  })
}
