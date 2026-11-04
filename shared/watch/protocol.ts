/**
 * LAN watch protocol — read-only live score snapshots.
 * Hosts publish GET /__setpoint/watch; viewers poll. Nothing in this payload
 * can change the scorer’s match.
 */
import type { MatchState, ThemeId } from '../engine/types.js'
import { isMatchState } from '../engine/validation.js'

export const WATCH_PROTOCOL = 'setpoint-watch' as const
export const WATCH_VERSION = 1
export const WATCH_PATH = '/__setpoint/watch'
export const WATCH_PORT = 47821
export const WATCH_SCAN_PORTS = [47821, 5173, 4173] as const
export const WATCH_HEADER = 'x-setpoint-watch'

export type WatchSnapshot = {
  protocol: typeof WATCH_PROTOCOL
  version: typeof WATCH_VERSION
  matchId: string
  playerNames: Record<string, string>
  state: MatchState
  theme: ThemeId
  updatedAt: number
  label: string
}

export type WatchFound = {
  url: string
  snapshot: WatchSnapshot
}

const THEMES = new Set<ThemeId>(['wimbledon', 'rolandGarros', 'usOpen', 'australianOpen'])

export function matchWatchLabel(args: {
  playerIds: string[]
  playerNames: Record<string, string>
  format: 'singles' | 'doubles'
}): string {
  const names = args.playerIds.map((id) => args.playerNames[id] || id)
  return args.format === 'doubles'
    ? `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
    : `${names[0]} vs ${names[1]}`
}

export function buildWatchSnapshot(args: {
  matchId: string
  playerNames: Record<string, string>
  state: MatchState
  theme: ThemeId
  updatedAt?: number
}): WatchSnapshot {
  return {
    protocol: WATCH_PROTOCOL,
    version: WATCH_VERSION,
    matchId: args.matchId,
    playerNames: { ...args.playerNames },
    state: { ...args.state, metadata: { ...args.state.metadata, notes: undefined } },
    theme: args.theme,
    updatedAt: args.updatedAt ?? Date.now(),
    label: matchWatchLabel({
      playerIds: args.state.config.playerIds,
      playerNames: args.playerNames,
      format: args.state.config.format,
    }),
  }
}

export function watchUrl(host: string, port: number): string {
  return `http://${host}:${port}${WATCH_PATH}`
}

/** Manual address field → one or more watch URLs to try. */
export function resolveWatchInput(raw: string): string[] {
  const text = raw.trim()
  if (!text) return []
  if (text.startsWith('http://') || text.startsWith('https://')) {
    const trimmed = text.replace(/\/$/, '')
    return [trimmed.endsWith(WATCH_PATH) ? trimmed : `${trimmed}${WATCH_PATH}`]
  }
  const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):(\d+)$/.exec(text)
  if (withPort) return [watchUrl(withPort[1], Number(withPort[2]))]
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(text)) {
    return WATCH_SCAN_PORTS.map((port) => watchUrl(text, port))
  }
  return []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTheme(value: unknown): ThemeId | null {
  return typeof value === 'string' && THEMES.has(value as ThemeId) ? (value as ThemeId) : null
}

export function parseWatchSnapshot(raw: unknown): WatchSnapshot | null {
  if (!isRecord(raw)) return null
  if (raw.protocol !== WATCH_PROTOCOL) return null
  if (raw.version !== WATCH_VERSION) return null
  if (typeof raw.matchId !== 'string' || raw.matchId.length === 0) return null
  if (typeof raw.label !== 'string') return null
  if (typeof raw.updatedAt !== 'number' || !Number.isFinite(raw.updatedAt)) return null
  const theme = asTheme(raw.theme)
  if (!theme) return null
  if (!isRecord(raw.playerNames)) return null
  const playerNames: Record<string, string> = {}
  for (const [id, name] of Object.entries(raw.playerNames)) {
    if (typeof name !== 'string') return null
    playerNames[id] = name
  }
  if (!isMatchState(raw.state)) return null
  return {
    protocol: WATCH_PROTOCOL,
    version: WATCH_VERSION,
    matchId: raw.matchId,
    playerNames,
    state: raw.state,
    theme,
    updatedAt: raw.updatedAt,
    label: raw.label,
  }
}

export function parseWatchSnapshotJson(text: string): WatchSnapshot | null {
  try {
    return parseWatchSnapshot(JSON.parse(text) as unknown)
  } catch {
    return null
  }
}
