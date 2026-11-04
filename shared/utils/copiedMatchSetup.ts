import type { CourtSurface, Format } from '../engine/types'
import type { MatchRecord } from '../records'

/** Form values copied from a finished (or in-progress) match onto New Match. */
export interface CopiedMatchSetup {
  format: Format
  names: string[]
  bestOf: 1 | 3 | 5
  tiebreakPoints: number
  finalSetTiebreak: boolean
  finalSetTbPoints: number
  noAdScoring: boolean
  breakSec: number
  changeoverSec: number
  ballChangeEnabled: boolean
  ballChangeFirst: number
  ballChangeEvery: number
  ballChangeSec: number
  warmupEnabled: boolean
  warmupSec: number
  firstServerIndex: number
  firstReceiverIndex: number
  weather: string
  surface: CourtSurface | undefined
  notes: string
}

/** Map a stored match onto New Match fields. Date / time of day stay fresh. */
export function copiedMatchSetup(match: MatchRecord): CopiedMatchSetup {
  const config = match.config
  const names = ['', '', '', '']
  config.playerIds.forEach((playerId, index) => {
    names[index] = match.playerNames[playerId] ?? ''
  })
  const serverIdx = config.playerIds.indexOf(config.firstServerId)
  let firstReceiverIndex = 2
  if (config.firstReceiverId) {
    const recvIdx = config.playerIds.indexOf(config.firstReceiverId)
    firstReceiverIndex = recvIdx >= 0 ? recvIdx : 2
  }
  return {
    format: config.format,
    names,
    bestOf: config.bestOf,
    tiebreakPoints: config.tiebreakPoints,
    finalSetTiebreak: config.finalSetTiebreak,
    finalSetTbPoints: config.finalSetTiebreakPoints,
    noAdScoring: config.noAdScoring === true,
    breakSec: config.breakDurationSeconds,
    changeoverSec: config.changeoverDurationSeconds,
    ballChangeEnabled: config.ballChangeEnabled !== false,
    ballChangeFirst: config.ballChangeFirstGames ?? 7,
    ballChangeEvery: config.ballChangeEveryGames ?? 9,
    ballChangeSec: config.ballChangeDurationSeconds ?? config.changeoverDurationSeconds,
    warmupEnabled: config.warmupEnabled === true,
    warmupSec: config.warmupDurationSeconds ?? 300,
    firstServerIndex: serverIdx >= 0 ? serverIdx : 0,
    firstReceiverIndex,
    weather: match.metadata.weather ?? '',
    surface: match.metadata.courtSurface,
    notes: match.metadata.notes ?? '',
  }
}
