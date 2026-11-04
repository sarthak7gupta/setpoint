/**
 * Side / lineup helpers, classic point display, serve-order construction, IDs.
 */
import type { Format, MatchConfig, MatchState, Side } from './types'

export function oppositeSide(side: Side): Side {
  return side === 'a' ? 'b' : 'a'
}

/** Map a player id to side `a` or `b` from `config.playerIds` order. */
export function sideOfPlayer(config: MatchConfig, playerId: string): Side {
  const ids = config.playerIds
  if (config.format === 'singles') {
    return playerId === ids[0] ? 'a' : 'b'
  }
  if (playerId === ids[0] || playerId === ids[1]) return 'a'
  return 'b'
}

export function playersOnSide(config: MatchConfig, side: Side): string[] {
  const ids = config.playerIds
  if (config.format === 'singles') {
    return side === 'a' ? [ids[0]] : [ids[1]]
  }
  return side === 'a' ? [ids[0], ids[1]] : [ids[2], ids[3]]
}

export function partnerOf(config: MatchConfig, playerId: string): string | null {
  if (config.format === 'singles') return null
  const side = sideOfPlayer(config, playerId)
  const players = playersOnSide(config, side)
  return players[0] === playerId ? players[1] : players[0]
}

export function setsToWin(bestOf: 1 | 3 | 5): number {
  return Math.ceil(bestOf / 2)
}

/** Classic tennis display for one side given raw point counts (handles AD). */
export function displayPoint(raw: number, opponent: number): string {
  if (raw >= 3 && opponent >= 3) {
    if (raw === opponent) return '40'
    if (raw === opponent + 1) return 'AD'
    // Trailing side is blank while the opponent has AD (TV-style).
    if (raw < opponent) return ''
  }
  const map = ['0', '15', '30', '40']
  return map[Math.min(raw, 3)] ?? '40'
}

export function isDeuce(pointsA: number, pointsB: number): boolean {
  return pointsA >= 3 && pointsB >= 3 && pointsA === pointsB
}

export function hasAdvantage(pointsA: number, pointsB: number): Side | null {
  if (pointsA >= 3 && pointsB >= 3) {
    if (pointsA === pointsB + 1) return 'a'
    if (pointsB === pointsA + 1) return 'b'
  }
  return null
}

/** Winner of a standard game, or null if still in progress. */
export function gameWinner(pointsA: number, pointsB: number, noAd = false): Side | null {
  if (noAd) {
    if (pointsA >= 4 && pointsA > pointsB) return 'a'
    if (pointsB >= 4 && pointsB > pointsA) return 'b'
    return null
  }
  if (pointsA >= 4 && pointsA >= pointsB + 2) return 'a'
  if (pointsB >= 4 && pointsB >= pointsA + 2) return 'b'
  return null
}

/**
 * Full match serve rotation.
 * Singles: [server, opponent]. Doubles: server → first receiver → server's partner → remaining.
 */
export function buildServeOrder(
  config: MatchConfig,
  firstServerId: string,
  firstReceiverId?: string,
): string[] {
  if (config.format === 'singles') {
    const other = config.playerIds.find((id) => id !== firstServerId)!
    return [firstServerId, other]
  }

  const serverSide = sideOfPlayer(config, firstServerId)
  const receivingSide = oppositeSide(serverSide)
  const receivingPlayers = playersOnSide(config, receivingSide)
  const servingPlayers = playersOnSide(config, serverSide)

  const firstReceiver =
    firstReceiverId && receivingPlayers.includes(firstReceiverId)
      ? firstReceiverId
      : receivingPlayers[0]
  const secondReceiver = receivingPlayers.find((id) => id !== firstReceiver)!
  const serverPartner = servingPlayers.find((id) => id !== firstServerId)!

  // Order: A serves, then B (first receiver's team), then A's partner, then B's partner
  return [firstServerId, firstReceiver, serverPartner, secondReceiver]
}

/**
 * Stable unique id. Prefers `crypto.randomUUID`; falls back on insecure contexts
 * (e.g. http://LAN-IP on mobile Safari) where randomUUID is unavailable.
 */
export function createId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // insecure context (e.g. http://LAN-IP on iOS) — fall through
  }
  // RFC4122-ish v4 fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const n = (Math.random() * 16) | 0
    const v = ch === 'x' ? n : (n & 0x3) | 0x8
    return v.toString(16)
  })
}

export function assertFormatPlayers(format: Format, playerIds: string[]): void {
  const expected = format === 'singles' ? 2 : 4
  if (playerIds.length !== expected) {
    throw new Error(`Expected ${expected} players for ${format}, got ${playerIds.length}`)
  }
}

/** Which scoreboard cell to emphasize for the side that won the last point. */
export type LastPointMark =
  | { target: 'points'; side: Side }
  | { target: 'set'; side: Side; setIndex: number }

/**
 * Rightmost live number for the last-point winner:
 * points while a game/TB is in progress, current-set games at 0–0,
 * previous set when the new set is still 0–0.
 */
export function lastPointMark(state: MatchState): LastPointMark | null {
  const last = state.events[state.events.length - 1]
  if (!last) return null
  const side = last.winnerSide
  const currentIdx = state.sets.findIndex((s) => !s.completed)
  const liveIdx = currentIdx === -1 ? Math.max(0, state.sets.length - 1) : currentIdx
  const live = state.sets[liveIdx]
  if (!live) return null

  const inTb = live.isTiebreak && !live.completed
  const pointTotal = inTb
    ? live.tiebreakPointsA + live.tiebreakPointsB
    : state.currentGame.pointsA + state.currentGame.pointsB
  if (pointTotal > 0) return { target: 'points', side }

  if (live.gamesA + live.gamesB > 0) return { target: 'set', side, setIndex: liveIdx }

  const prevIdx = liveIdx - 1
  if (prevIdx >= 0) return { target: 'set', side, setIndex: prevIdx }
  return null
}
