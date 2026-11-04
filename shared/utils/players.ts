import type { MatchRecord, PlayerRecord } from '../records'

export function canonicalPlayerId(id: string, players: PlayerRecord[]): string {
  const seen = new Set<string>()
  while (!seen.has(id)) {
    seen.add(id)
    const next = players.find((p) => p.id === id)?.mergedInto
    if (!next) return id
    if (!players.some((p) => p.id === next)) throw new Error('Missing merged player profile')
    id = next
  }
  throw new Error('Player merge cycle')
}

export function playerIdentityIds(id: string, players: PlayerRecord[]): Set<string> {
  const canonical = canonicalPlayerId(id, players)
  return new Set([
    canonical,
    ...players.filter((p) => canonicalPlayerId(p.id, players) === canonical).map((p) => p.id),
  ])
}

/** Preserve source rows and historical lineups; only explicit aliases change. */
export function mergePlayerProfiles(
  players: PlayerRecord[],
  matches: MatchRecord[],
  source: string,
  target: string,
): PlayerRecord[] {
  const from = canonicalPlayerId(source, players)
  const to = canonicalPlayerId(target, players)
  if (from === to || !players.some((p) => p.id === from) || !players.some((p) => p.id === to))
    throw new Error('Choose two different profiles')
  const fromIds = playerIdentityIds(from, players)
  const toIds = playerIdentityIds(to, players)
  if (
    matches.some(
      (m) =>
        m.config.playerIds.some((id) => fromIds.has(id)) &&
        m.config.playerIds.some((id) => toIds.has(id)),
    )
  )
    throw new Error('Profiles played in the same match and cannot be merged')
  return players.map((p) => (p.id === from ? { ...p, mergedInto: to } : p))
}

export function recoverPlayerProfiles(
  players: PlayerRecord[],
  matches: MatchRecord[],
): PlayerRecord[] {
  const result = new Map(players.map((p) => [p.id, p]))
  for (const m of matches)
    for (const id of m.config.playerIds) {
      if (!result.has(id))
        result.set(id, { id, name: m.playerNames[id] || id, createdAt: m.createdAt })
    }
  return [...result.values()].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  )
}
