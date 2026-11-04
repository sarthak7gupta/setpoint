import type { MatchConfig, MatchMetadata, MatchState } from './types.js'

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const count = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0
const side = (v: unknown) => v === 'a' || v === 'b'
const optional = (v: unknown, check: (v: unknown) => boolean) => v === undefined || check(v)

export function isMatchConfig(v: unknown): v is MatchConfig {
  if (!isRecord(v) || !['singles', 'doubles'].includes(String(v.format))) return false
  const ids = v.playerIds
  if (
    !Array.isArray(ids) ||
    ids.length !== (v.format === 'singles' ? 2 : 4) ||
    !ids.every(text) ||
    new Set(ids).size !== ids.length
  )
    return false
  if (
    ![1, 3, 5].includes(Number(v.bestOf)) ||
    typeof v.bestOf !== 'number' ||
    !ids.includes(v.firstServerId as string)
  )
    return false
  if (
    !count(v.tiebreakPoints) ||
    v.tiebreakPoints < 1 ||
    !count(v.finalSetTiebreakPoints) ||
    v.finalSetTiebreakPoints < 1 ||
    typeof v.finalSetTiebreak !== 'boolean'
  )
    return false
  if (!count(v.breakDurationSeconds) || !count(v.changeoverDurationSeconds)) return false
  for (const key of ['noAdScoring', 'warmupEnabled', 'ballChangeEnabled'])
    if (!optional(v[key], (x) => typeof x === 'boolean')) return false
  for (const key of ['warmupDurationSeconds', 'ballChangeDurationSeconds'])
    if (!optional(v[key], count)) return false
  for (const key of ['ballChangeFirstGames', 'ballChangeEveryGames'])
    if (!optional(v[key], (x) => count(x) && x > 0)) return false
  if (v.firstReceiverId !== undefined) {
    if (!ids.includes(v.firstReceiverId as string)) return false
    const split = v.format === 'singles' ? 1 : 2
    if (
      ids.indexOf(v.firstServerId as string) < split ===
      ids.indexOf(v.firstReceiverId as string) < split
    )
      return false
  }
  return true
}

export function isMatchMetadata(v: unknown): v is MatchMetadata {
  return (
    isRecord(v) &&
    typeof v.date === 'string' &&
    optional(v.timeOfDay, (x) =>
      ['morning', 'afternoon', 'evening', 'night'].includes(String(x)),
    ) &&
    optional(v.courtSurface, (x) =>
      ['grass', 'clay', 'hard', 'carpet', 'indoor', 'concrete'].includes(String(x)),
    ) &&
    ['weather', 'notes'].every((k) => optional(v[k], (x) => typeof x === 'string'))
  )
}

/** Validate data crossing disk, backup and spectator seams before it is trusted. */
export function isMatchState(v: unknown): v is MatchState {
  if (!isRecord(v) || !isMatchConfig(v.config) || !isMatchMetadata(v.metadata)) return false
  const ids = v.config.playerIds
  if (!Array.isArray(v.sets) || v.sets.length < 1 || v.sets.length > v.config.bestOf) return false
  if (
    !v.sets.every(
      (s) =>
        isRecord(s) &&
        ['gamesA', 'gamesB', 'tiebreakPointsA', 'tiebreakPointsB'].every((k) => count(s[k])) &&
        typeof s.isTiebreak === 'boolean' &&
        typeof s.completed === 'boolean' &&
        (s.completed ? side(s.winner) : s.winner === undefined),
    )
  )
    return false
  if (v.sets.slice(0, -1).some((s) => !s.completed)) return false
  if (!isRecord(v.currentGame) || !count(v.currentGame.pointsA) || !count(v.currentGame.pointsB))
    return false
  if (![v.serverId, v.receiverId, v.setFirstServerId].every((id) => ids.includes(id as string)))
    return false
  const split = v.config.format === 'singles' ? 1 : 2
  const onA = (id: unknown) => ids.indexOf(id as string) < split
  if (onA(v.serverId) === onA(v.receiverId)) return false
  if (!['deuce', 'ad'].includes(String(v.receiverCourt)) || typeof v.isSecondServe !== 'boolean')
    return false
  if (
    !Array.isArray(v.serveOrder) ||
    v.serveOrder.length !== ids.length ||
    new Set(v.serveOrder).size !== ids.length ||
    !v.serveOrder.every((id) => ids.includes(id))
  )
    return false
  if (
    !count(v.serveOrderIndex) ||
    v.serveOrderIndex >= ids.length ||
    v.serveOrder[v.serveOrderIndex] !== v.serverId
  )
    return false
  if (
    !isRecord(v.deuceReceiverBySide) ||
    !ids.slice(0, split).includes(v.deuceReceiverBySide.a as string) ||
    !ids.slice(split).includes(v.deuceReceiverBySide.b as string)
  )
    return false
  if (
    !['tiebreakPointsPlayed', 'gamesCompletedInSet', 'gamesCompletedInMatch', 'startedAt'].every(
      (k) => count(v[k]),
    )
  )
    return false
  if (!['finishedAt', 'pausedAt', 'pausedMs', 'awayAt'].every((k) => optional(v[k], count)))
    return false
  if (
    !optional(v.deferredBallChange, (x) => typeof x === 'boolean') ||
    !optional(v.endedBy, (x) => x === 'walkover')
  )
    return false
  if (
    !['none', 'warmup', 'changeover', 'ball_change', 'set_break', 'match_end'].includes(
      String(v.pendingOverlay),
    ) ||
    typeof v.isComplete !== 'boolean'
  )
    return false
  if (
    v.isComplete
      ? !side(v.winner) || v.pendingOverlay !== 'match_end'
      : v.winner !== undefined || v.pendingOverlay === 'match_end'
  )
    return false
  if (
    !Array.isArray(v.events) ||
    !v.events.every(
      (e) =>
        isRecord(e) &&
        text(e.id) &&
        side(e.winnerSide) &&
        ids.includes(e.serverId as string) &&
        ids.includes(e.receiverId as string) &&
        onA(e.serverId) !== onA(e.receiverId) &&
        optional(e.attributedPlayerId, (x) => ids.includes(x as string)) &&
        ['winner', 'unforced_error', 'ace', 'double_fault', 'other'].includes(String(e.outcome)) &&
        [1, 2].includes(e.serveNumber as number) &&
        ['hadFirstServeFault', 'isBreakPoint', 'isGamePoint', 'isSetPoint', 'isMatchPoint'].every(
          (k) => typeof e[k] === 'boolean',
        ) &&
        count(e.setIndex) &&
        e.setIndex < (v.sets as unknown[]).length &&
        count(e.timestamp),
    )
  )
    return false
  return true
}

export function assertMatchConfig(config: MatchConfig): void {
  if (!isMatchConfig(config)) throw new Error('Invalid match rules or lineup')
}
