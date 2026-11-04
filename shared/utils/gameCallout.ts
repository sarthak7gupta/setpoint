/**
 * Umpire-style spoken lines after a scoring transition (game, set, score, fault).
 * Copy lives in `calloutCopy.ts` (English) and native i18n catalogs.
 */
import {
  formatSetScore,
  getServeInfo,
  isInTiebreak,
  type MatchState,
  playersOnSide,
  type Side,
} from '../engine'
import { hasAdvantage, isDeuce } from '../engine/helpers'

export type CalloutKey =
  | 'callout.game'
  | 'callout.gameSet'
  | 'callout.gameSetMatch'
  | 'callout.firstSet'
  | 'callout.secondSet'
  | 'callout.thirdSet'
  | 'callout.fourthSet'
  | 'callout.fifthSet'
  | 'callout.time'
  | 'callout.serveTo'
  | 'callout.setServeTo'
  | 'callout.points'
  | 'callout.pointsAll'
  | 'callout.love'
  | 'callout.deuce'
  | 'callout.decidingPoint'
  | 'callout.advantage'
  | 'callout.fault'
  | 'callout.doubleFault'
  | 'callout.gamesAll'
  | 'callout.tiebreak'

export type CalloutTranslate = (key: CalloutKey, vars?: Record<string, string | number>) => string

const SET_ORDINAL: CalloutKey[] = [
  'callout.firstSet',
  'callout.secondSet',
  'callout.thirdSet',
  'callout.fourthSet',
  'callout.fifthSet',
]

const REST_OVERLAYS = new Set(['warmup', 'changeover', 'ball_change', 'set_break'])

function sideName(state: MatchState, side: Side, nameOf: (id: string) => string): string {
  return playersOnSide(state.config, side).map(nameOf).join(' / ')
}

function spokenPoint(raw: number, t: CalloutTranslate): string {
  if (raw <= 0) return t('callout.love')
  if (raw === 1) return '15'
  if (raw === 2) return '30'
  return '40'
}

/** "{server} to serve." Optionally prefixes the set ordinal. */
export function serveCalloutText(args: {
  state: MatchState
  nameOf: (id: string) => string
  t: CalloutTranslate
  withSet?: boolean
}): string {
  const { state, nameOf, t, withSet } = args
  const server = nameOf(getServeInfo(state).serverId)
  if (withSet) {
    const ordinal = SET_ORDINAL[state.sets.length - 1] ?? 'callout.firstSet'
    return t('callout.setServeTo', { set: t(ordinal), server })
  }
  return t('callout.serveTo', { server })
}

function pointScoreCallout(
  state: MatchState,
  nameOf: (id: string) => string,
  t: CalloutTranslate,
): string {
  const serve = getServeInfo(state)
  if (isInTiebreak(state)) {
    const set = state.sets[state.sets.length - 1]
    const serverPts = serve.servingSide === 'a' ? set.tiebreakPointsA : set.tiebreakPointsB
    const recvPts = serve.servingSide === 'a' ? set.tiebreakPointsB : set.tiebreakPointsA
    return t('callout.points', { server: String(serverPts), receiver: String(recvPts) })
  }
  const { pointsA, pointsB } = state.currentGame
  if (isDeuce(pointsA, pointsB)) {
    return state.config.noAdScoring ? t('callout.decidingPoint') : t('callout.deuce')
  }
  const ad = hasAdvantage(pointsA, pointsB)
  if (ad) return t('callout.advantage', { name: sideName(state, ad, nameOf) })
  const serverRaw = serve.servingSide === 'a' ? pointsA : pointsB
  const recvRaw = serve.servingSide === 'a' ? pointsB : pointsA
  if (serverRaw === recvRaw && serverRaw > 0) {
    return t('callout.pointsAll', { score: spokenPoint(serverRaw, t) })
  }
  return t('callout.points', {
    server: spokenPoint(serverRaw, t),
    receiver: spokenPoint(recvRaw, t),
  })
}

function outcomePrefix(state: MatchState, t: CalloutTranslate): string | null {
  const last = state.events[state.events.length - 1]
  if (last?.outcome === 'double_fault') return t('callout.doubleFault')
  return null
}

/**
 * Umpire-style line after a completed game, set, or match.
 * Returns null if no game just finished.
 */
export function buildGameCallout(args: {
  prev: MatchState
  next: MatchState
  nameOf: (id: string) => string
  t: CalloutTranslate
}): string | null {
  const { prev, next, nameOf, t } = args
  if ((next.gamesCompletedInMatch ?? 0) <= (prev.gamesCompletedInMatch ?? 0)) return null
  const winnerSide = next.events[next.events.length - 1]?.winnerSide
  if (!winnerSide) return null

  const name = sideName(next, winnerSide, nameOf)
  const setsDonePrev = prev.sets.filter((s) => s.completed).length
  const setsDoneNext = next.sets.filter((s) => s.completed).length
  const setJustEnded = setsDoneNext > setsDonePrev

  const parts: string[] = []
  const prefix = outcomePrefix(next, t)
  if (prefix) parts.push(prefix)
  if (next.isComplete) {
    parts.push(t('callout.gameSetMatch', { name }))
  } else if (setJustEnded) {
    parts.push(t('callout.gameSet', { name }))
  } else {
    parts.push(t('callout.game', { name }))
  }

  if (!isInTiebreak(prev) && isInTiebreak(next)) {
    const set = next.sets[next.sets.length - 1]
    parts.push(t('callout.gamesAll', { games: Math.min(set.gamesA, set.gamesB) }))
    parts.push(t('callout.tiebreak'))
  }

  const completed = next.sets.filter((s) => s.completed)
  if (completed.length > 0 && (setJustEnded || next.isComplete)) {
    parts.push(completed.map((s) => formatSetScore(s).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')).join(', '))
  }

  return parts.join(' ')
}

/**
 * Chair-umpire lines only: score, faults, games, and who serves at a new game/set.
 */
export function buildLiveCallout(args: {
  prev: MatchState | null
  next: MatchState
  nameOf: (id: string) => string
  t: CalloutTranslate
}): string | null {
  const { prev, next, nameOf, t } = args
  if (next.pausedAt) return null

  if (!prev) {
    if (next.pendingOverlay !== 'none' || next.isComplete || next.events.length > 0) return null
    return serveCalloutText({ state: next, nameOf, t, withSet: true })
  }

  if (prev.pausedAt && !next.pausedAt) return null

  const overlayCleared =
    prev.pendingOverlay !== 'none' &&
    next.pendingOverlay === 'none' &&
    next.events.length === prev.events.length &&
    !next.isComplete
  if (overlayCleared) {
    const withSet = prev.pendingOverlay === 'warmup' || prev.pendingOverlay === 'set_break'
    return serveCalloutText({ state: next, nameOf, t, withSet })
  }

  const gameLine = buildGameCallout({ prev, next, nameOf, t })
  if (gameLine) {
    if (next.isComplete) return gameLine
    if (REST_OVERLAYS.has(next.pendingOverlay)) return gameLine
    return `${gameLine} ${serveCalloutText({ state: next, nameOf, t })}`
  }

  if (!prev.isSecondServe && next.isSecondServe && next.events.length === prev.events.length) {
    return t('callout.fault')
  }

  if (next.events.length <= prev.events.length) return null
  if (next.isComplete) return null

  const parts: string[] = []
  const prefix = outcomePrefix(next, t)
  if (prefix) parts.push(prefix)
  parts.push(pointScoreCallout(next, nameOf, t))
  return parts.join(' ')
}
