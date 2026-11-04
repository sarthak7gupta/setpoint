import type { PlayerRecord } from '../records'
import { canonicalPlayerId } from '../utils/players'
/**
 * Recent form (last 5 completed matches) and head-to-head from stored matches.
 */

import { playersOnSide, sideOfPlayer } from '../engine/helpers'
import type { Format, Side } from '../engine/types'
import type { MatchRecord } from '../records'

export type FormResult = 'win' | 'loss' | 'empty'

const FORM_LENGTH = 5

function sideKey(ids: string[]): string {
  return [...ids].sort().join('|')
}

function completedMatches(matches: MatchRecord[]): MatchRecord[] {
  return matches.filter((m) => m.state.isComplete && m.state.winner)
}

export function playerIdInMatch(args: {
  match: MatchRecord
  ids: Set<string>
}): string | undefined {
  return args.match.config.playerIds.find((id) => args.ids.has(id))
}

/** Last 5 results for a player, oldest first; grey pads on the left if fewer. */
export function playerForm(args: {
  playerId: string
  identityIds?: Iterable<string>
  matches: MatchRecord[]
}): FormResult[] {
  const { playerId, matches } = args
  const ids = new Set(args.identityIds ?? [playerId])
  const involved = completedMatches(matches)
    .filter((match) => playerIdInMatch({ match, ids }))
    .sort((a, b) => (a.completedAt ?? a.updatedAt) - (b.completedAt ?? b.updatedAt))
  const recent = involved.slice(-FORM_LENGTH)
  const outcomes: Array<'win' | 'loss'> = recent.map((match) => {
    const idInMatch = playerIdInMatch({ match, ids }) ?? playerId
    const side = sideOfPlayer(match.config, idInMatch)
    return match.state.winner === side ? 'win' : 'loss'
  })
  const pad = FORM_LENGTH - outcomes.length
  return [...Array<'empty'>(pad).fill('empty'), ...outcomes]
}

export interface HeadToHead {
  meetings: number
  winsA: number
  winsB: number
}

/** Prior completed meetings between the same two sides (order of partners ignored). */
export function headToHead(args: {
  format: Format
  idsA: string[]
  idsB: string[]
  players?: PlayerRecord[]
  matches: MatchRecord[]
}): HeadToHead | null {
  const { format, idsA, idsB, matches } = args
  if (idsA.length === 0 || idsB.length === 0) return null
  if (idsA.some((id) => idsB.includes(id))) return null
  const canonical = (ids: string[]) => ids.map((id) => canonicalPlayerId(id, args.players ?? []))
  const keyA = sideKey(canonical(idsA))
  const keyB = sideKey(canonical(idsB))
  let winsA = 0
  let winsB = 0
  let meetings = 0
  for (const match of completedMatches(matches)) {
    if (match.config.format !== format) continue
    const histA = sideKey(canonical(playersOnSide(match.config, 'a')))
    const histB = sideKey(canonical(playersOnSide(match.config, 'b')))
    let winnerAsA: Side | null = null
    if (histA === keyA && histB === keyB) winnerAsA = 'a'
    else if (histA === keyB && histB === keyA) winnerAsA = 'b'
    if (!winnerAsA) continue
    meetings += 1
    if (match.state.winner === winnerAsA) winsA += 1
    else winsB += 1
  }
  if (meetings === 0) return null
  return { meetings, winsA, winsB }
}
