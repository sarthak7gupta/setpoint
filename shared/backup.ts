/**
 * Portable SetPoint backup — players, matches, and overlapping settings.
 * Same JSON works on the web app and the native app.
 */
import type {
  CourtSurface,
  Format,
  MatchConfig,
  MatchMetadata,
  MatchState,
  ThemeId,
} from './engine/types'
import { isMatchConfig, isMatchMetadata, isMatchState } from './engine/validation'
import type { MatchRecord, PlayerRecord } from './records'
import { commonSettings, validSetting } from './settings'
import { canonicalPlayerId } from './utils/players'

export const BACKUP_KIND = 'setpoint-backup'
export const BACKUP_VERSION = 1

export type BackupErrorCode = 'invalid_json' | 'not_backup' | 'unsupported_version'

export class BackupError extends Error {
  readonly code: BackupErrorCode

  constructor(code: BackupErrorCode) {
    super(code)
    this.name = 'BackupError'
    this.code = code
  }
}

export function isBackupError(error: unknown): error is BackupError {
  return error instanceof BackupError
}

/** Settings that both apps share. Native locale / haptics stay on the device. */
export interface PortableSettings {
  theme?: ThemeId
  defaultFormat?: Format
  defaultBestOf?: 1 | 3 | 5
  defaultTiebreakPoints?: number
  defaultFinalSetTiebreak?: boolean
  defaultFinalSetTiebreakPoints?: number
  defaultNoAdScoring?: boolean
  defaultBreakSeconds?: number
  defaultChangeoverSeconds?: number
  defaultBallChangeEnabled?: boolean
  defaultBallChangeFirstGames?: number
  defaultBallChangeEveryGames?: number
  defaultBallChangeSeconds?: number
  defaultWarmupEnabled?: boolean
  defaultWarmupSeconds?: number
  defaultCourtSurface?: CourtSurface
  defaultWeather?: string
  voiceCalloutsEnabled?: boolean
  voiceCommandsEnabled?: boolean
}

export interface SetPointBackup {
  kind: typeof BACKUP_KIND
  version: number
  exportedAt: number
  /** Invalid input rows omitted by parsing; never silently claim a complete restore. */
  skippedRecords?: number
  players: PlayerRecord[]
  matches: MatchRecord[]
  settings: PortableSettings
}

export interface MergeBackupResult {
  players: PlayerRecord[]
  matches: MatchRecord[]
  settings: PortableSettings
  summary: {
    players: number
    matches: number
    matchesAdded: number
    matchesUpdated: number
  }
}

const THEMES = new Set<ThemeId>(['wimbledon', 'rolandGarros', 'usOpen', 'australianOpen'])
const FORMATS = new Set<Format>(['singles', 'doubles'])
const SURFACES = new Set<CourtSurface>(['grass', 'clay', 'hard', 'carpet', 'indoor', 'concrete'])
const BEST_OF = new Set<1 | 3 | 5>([1, 3, 5])

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asTheme(value: unknown): ThemeId | undefined {
  return typeof value === 'string' && THEMES.has(value as ThemeId) ? (value as ThemeId) : undefined
}

function asFormat(value: unknown): Format | undefined {
  return typeof value === 'string' && FORMATS.has(value as Format) ? (value as Format) : undefined
}

function asBestOf(value: unknown): 1 | 3 | 5 | undefined {
  return typeof value === 'number' && BEST_OF.has(value as 1 | 3 | 5)
    ? (value as 1 | 3 | 5)
    : undefined
}

function asSurface(value: unknown): CourtSurface | undefined {
  return typeof value === 'string' && SURFACES.has(value as CourtSurface)
    ? (value as CourtSurface)
    : undefined
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function portableSettingsFrom(raw: object): PortableSettings {
  const source = raw as Record<string, unknown>
  const out: PortableSettings = {}
  const theme = asTheme(source.theme)
  if (theme) out.theme = theme
  const format = asFormat(source.defaultFormat)
  if (format) out.defaultFormat = format
  const bestOf = asBestOf(source.defaultBestOf)
  if (bestOf) out.defaultBestOf = bestOf
  const tb = asFiniteNumber(source.defaultTiebreakPoints)
  if (tb !== undefined) out.defaultTiebreakPoints = tb
  const finalTb = asBoolean(source.defaultFinalSetTiebreak)
  if (finalTb !== undefined) out.defaultFinalSetTiebreak = finalTb
  const finalTbPts = asFiniteNumber(source.defaultFinalSetTiebreakPoints)
  if (finalTbPts !== undefined) out.defaultFinalSetTiebreakPoints = finalTbPts
  const noAd = asBoolean(source.defaultNoAdScoring)
  if (noAd !== undefined) out.defaultNoAdScoring = noAd
  const breakSec = asFiniteNumber(source.defaultBreakSeconds)
  if (breakSec !== undefined) out.defaultBreakSeconds = breakSec
  const changeoverSec = asFiniteNumber(source.defaultChangeoverSeconds)
  if (changeoverSec !== undefined) out.defaultChangeoverSeconds = changeoverSec
  const ballOn = asBoolean(source.defaultBallChangeEnabled)
  if (ballOn !== undefined) out.defaultBallChangeEnabled = ballOn
  const ballFirst = asFiniteNumber(source.defaultBallChangeFirstGames)
  if (ballFirst !== undefined) out.defaultBallChangeFirstGames = ballFirst
  const ballEvery = asFiniteNumber(source.defaultBallChangeEveryGames)
  if (ballEvery !== undefined) out.defaultBallChangeEveryGames = ballEvery
  const ballSec = asFiniteNumber(source.defaultBallChangeSeconds)
  if (ballSec !== undefined) out.defaultBallChangeSeconds = ballSec
  const warmupOn = asBoolean(source.defaultWarmupEnabled)
  if (warmupOn !== undefined) out.defaultWarmupEnabled = warmupOn
  const warmupSec = asFiniteNumber(source.defaultWarmupSeconds)
  if (warmupSec !== undefined) out.defaultWarmupSeconds = warmupSec
  const surface = asSurface(source.defaultCourtSurface)
  if (surface) out.defaultCourtSurface = surface
  const weather = asString(source.defaultWeather)
  if (weather !== undefined) out.defaultWeather = weather
  const callouts = asBoolean(source.voiceCalloutsEnabled)
  if (callouts !== undefined) out.voiceCalloutsEnabled = callouts
  const commands = asBoolean(source.voiceCommandsEnabled)
  if (commands !== undefined) out.voiceCommandsEnabled = commands
  for (const key of Object.keys(out) as (keyof PortableSettings)[]) {
    if (
      key in commonSettings &&
      !validSetting(key, out[key], commonSettings[key as keyof typeof commonSettings])
    )
      delete out[key]
  }
  return out
}

function parsePlayer(value: unknown): PlayerRecord | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || !value.id.trim()) return null
  if (typeof value.name !== 'string' || !value.name.trim()) return null
  const createdAt = asFiniteNumber(value.createdAt)
  if (createdAt === undefined) return null
  const player: PlayerRecord = {
    id: value.id,
    name: value.name.trim(),
    createdAt,
  }
  if (typeof value.mergedInto === 'string' && value.mergedInto !== value.id)
    player.mergedInto = value.mergedInto
  const notes = asString(value.notes)
  if (notes !== undefined) player.notes = notes
  return player
}

function parseMatch(value: unknown): MatchRecord | null {
  if (!isObject(value)) return null
  if (typeof value.id !== 'string' || !value.id.trim()) return null
  const createdAt = asFiniteNumber(value.createdAt)
  const updatedAt = asFiniteNumber(value.updatedAt)
  if (createdAt === undefined || updatedAt === undefined) return null
  if (
    !isMatchConfig(value.config) ||
    !isMatchMetadata(value.metadata) ||
    !isMatchState(value.state)
  )
    return null
  if (
    Object.keys(value.config).some(
      (key) =>
        JSON.stringify((value.config as unknown as Record<string, unknown>)[key]) !==
        JSON.stringify((value.state as unknown as { config: Record<string, unknown> }).config[key]),
    )
  )
    return null
  if (!isObject(value.metadata) || !isObject(value.state) || !isObject(value.playerNames))
    return null
  const playerNames: Record<string, string> = {}
  for (const [id, name] of Object.entries(value.playerNames)) {
    if (typeof name === 'string') playerNames[id] = name
  }
  const record: MatchRecord = {
    id: value.id,
    createdAt,
    updatedAt,
    config: value.config as unknown as MatchConfig,
    metadata: value.metadata as unknown as MatchMetadata,
    state: value.state as unknown as MatchState,
    playerNames,
  }
  const completedAt = asFiniteNumber(value.completedAt)
  if (completedAt !== undefined) record.completedAt = completedAt
  if (Array.isArray(value.undoHistory)) {
    record.undoHistory = value.undoHistory.filter(
      (snap): snap is MatchState =>
        isMatchState(snap) &&
        JSON.stringify(snap.config.playerIds) ===
          JSON.stringify((value.config as MatchConfig).playerIds),
    ) as unknown as MatchState[]
  }
  return record
}

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Map<string, T>()
  for (const row of rows) {
    if (!seen.has(row.id)) seen.set(row.id, row)
  }
  return [...seen.values()]
}

export function backupFileName(exportedAt: number = Date.now()): string {
  const date = new Date(exportedAt)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `setpoint-${year}-${month}-${day}.json`
}

export function buildBackup(args: {
  players: PlayerRecord[]
  matches: MatchRecord[]
  settings: object
  exportedAt?: number
}): SetPointBackup {
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: args.exportedAt ?? Date.now(),
    players: uniqueById(
      args.players.map(parsePlayer).filter((row): row is PlayerRecord => row !== null),
    ),
    matches: uniqueById(
      args.matches.map(parseMatch).filter((row): row is MatchRecord => row !== null),
    ),
    settings: portableSettingsFrom(args.settings),
  }
}

export function stringifyBackup(backup: SetPointBackup): string {
  return `${JSON.stringify(backup, null, 2)}\n`
}

export function parseBackup(raw: string): SetPointBackup {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new BackupError('invalid_json')
  }
  if (!isObject(parsed) || parsed.kind !== BACKUP_KIND) {
    throw new BackupError('not_backup')
  }
  if (parsed.version !== BACKUP_VERSION) {
    throw new BackupError('unsupported_version')
  }
  const players = Array.isArray(parsed.players)
    ? parsed.players.map(parsePlayer).filter((row): row is PlayerRecord => row !== null)
    : []
  const matches = Array.isArray(parsed.matches)
    ? parsed.matches.map(parseMatch).filter((row): row is MatchRecord => row !== null)
    : []
  const settings = isObject(parsed.settings) ? portableSettingsFrom(parsed.settings) : {}
  const exportedAt = asFiniteNumber(parsed.exportedAt) ?? Date.now()
  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt,
    ...((Array.isArray(parsed.players) ? parsed.players.length - players.length : 0) +
      (Array.isArray(parsed.matches) ? parsed.matches.length - matches.length : 0) >
    0
      ? {
          skippedRecords:
            (Array.isArray(parsed.players) ? parsed.players.length - players.length : 0) +
            (Array.isArray(parsed.matches) ? parsed.matches.length - matches.length : 0),
        }
      : {}),
    players: uniqueById(players),
    matches: uniqueById(matches),
    settings,
  }
}

function mergePlayer(current: PlayerRecord | undefined, incoming: PlayerRecord): PlayerRecord {
  if (!current) return incoming
  return {
    id: current.id,
    name: incoming.name || current.name,
    createdAt: Math.min(current.createdAt, incoming.createdAt),
    notes: incoming.notes ?? current.notes,
    mergedInto: current.mergedInto ?? incoming.mergedInto,
  }
}

function mergeMatch(current: MatchRecord | undefined, incoming: MatchRecord): MatchRecord {
  if (!current) return incoming
  return incoming.updatedAt > current.updatedAt ? incoming : current
}

export function backupMatchDate(match: MatchRecord): string {
  const raw = match.metadata.date?.trim() ?? ''
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const date = new Date(match.createdAt)
  if (!Number.isFinite(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function backupMatchLabel(match: MatchRecord): string {
  const names = match.config.playerIds.map((id) => match.playerNames[id] ?? id)
  return match.config.format === 'doubles'
    ? `${names[0]}/${names[1]} vs ${names[2]}/${names[3]}`
    : `${names[0]} vs ${names[1]}`
}

export function backupPlayerNames(matches: MatchRecord[]): string[] {
  const names = new Set<string>()
  for (const match of matches) {
    for (const playerId of match.config.playerIds) {
      const name = match.playerNames[playerId]?.trim()
      if (name) names.add(name)
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export function filterBackupMatches(args: {
  matches: MatchRecord[]
  /** @deprecated Prefer `playerNames` for multi-select. */
  playerName?: string
  /** When set, keep matches that include any of these players (case-insensitive). */
  playerNames?: string[]
  fromDate?: string
  toDate?: string
  format?: Format | ''
}): MatchRecord[] {
  const selectedPlayers = [
    ...(args.playerNames ?? []),
    ...(args.playerName ? [args.playerName] : []),
  ]
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean)
  const playerKeys = new Set(selectedPlayers)
  const from = args.fromDate?.trim().slice(0, 10)
  const to = args.toDate?.trim().slice(0, 10)
  const format = args.format
  return args.matches
    .filter((match) => {
      if (format && match.config.format !== format) return false
      if (playerKeys.size > 0) {
        const names = match.config.playerIds.map(
          (id) => match.playerNames[id]?.trim().toLowerCase() ?? '',
        )
        if (!names.some((name) => playerKeys.has(name))) return false
      }
      if (from || to) {
        const date = backupMatchDate(match)
        if (!date) return false
        if (from && date < from) return false
        if (to && date > to) return false
      }
      return true
    })
    .sort((a, b) => {
      const byDate = backupMatchDate(b).localeCompare(backupMatchDate(a))
      if (byDate !== 0) return byDate
      return b.updatedAt - a.updatedAt
    })
}

export function sliceBackup(args: {
  backup: SetPointBackup
  matchIds: Iterable<string>
  includeSettings: boolean
}): SetPointBackup {
  const selected = new Set(args.matchIds)
  const matches = args.backup.matches.filter((match) => selected.has(match.id))
  const usedIds = new Set<string>()
  for (const match of matches) {
    for (const playerId of match.config.playerIds) usedIds.add(playerId)
  }
  const playersById = new Map(args.backup.players.map((player) => [player.id, player]))
  for (const id of usedIds) {
    let current = id
    const seen = new Set<string>()
    while (!seen.has(current)) {
      seen.add(current)
      const target = playersById.get(current)?.mergedInto
      if (!target) break
      usedIds.add(target)
      current = target
    }
  }
  for (const match of matches) {
    for (const playerId of match.config.playerIds) {
      if (playersById.has(playerId) || !usedIds.has(playerId)) continue
      const name = match.playerNames[playerId]?.trim()
      if (!name) continue
      playersById.set(playerId, { id: playerId, name, createdAt: match.createdAt })
    }
  }
  return {
    ...args.backup,
    players: [...playersById.values()].filter((player) => usedIds.has(player.id)),
    matches,
    settings: args.includeSettings ? args.backup.settings : {},
  }
}

export function mergeBackup(args: {
  currentPlayers: PlayerRecord[]
  currentMatches: MatchRecord[]
  currentSettings: object
  backup: SetPointBackup
}): MergeBackupResult {
  const playersById = new Map(args.currentPlayers.map((player) => [player.id, player]))
  for (const incoming of args.backup.players) {
    playersById.set(incoming.id, mergePlayer(playersById.get(incoming.id), incoming))
  }

  for (const player of playersById.values()) canonicalPlayerId(player.id, [...playersById.values()])
  const matchesById = new Map(args.currentMatches.map((match) => [match.id, match]))
  let matchesAdded = 0
  let matchesUpdated = 0
  for (const incoming of args.backup.matches) {
    const current = matchesById.get(incoming.id)
    if (!current) {
      matchesById.set(incoming.id, incoming)
      matchesAdded += 1
      continue
    }
    const next = mergeMatch(current, incoming)
    if (next !== current) matchesUpdated += 1
    matchesById.set(incoming.id, next)
  }

  return {
    players: [...playersById.values()],
    matches: [...matchesById.values()],
    settings: {
      ...portableSettingsFrom(args.currentSettings),
      ...args.backup.settings,
    },
    summary: {
      players: args.backup.players.length,
      matches: args.backup.matches.length,
      matchesAdded,
      matchesUpdated,
    },
  }
}
