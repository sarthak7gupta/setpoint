import { isMatchState } from '../../../shared/engine/validation'
import { commonSettings, createSettingsStore, type CommonSettings } from '../../../shared/settings'
/**
 * Native persistence: AsyncStorage for players, matches, and settings.
 * Same `MatchRecord` / `PlayerRecord` shape as the web Dexie DB.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  buildBackup,
  mergeBackup,
  type MergeBackupResult,
  type SetPointBackup,
} from '../../../shared/backup'
import type { MatchRecord, PlayerRecord } from '../../../shared/records'
import { mergePlayerProfiles, recoverPlayerProfiles } from '../../../shared/utils/players'
import { createId } from '../engine/helpers'

export type { MatchRecord, PlayerRecord }

const PLAYERS_KEY = 'setpoint.players'
const MATCHES_KEY = 'setpoint.matches'
const SETTINGS_KEY = 'setpoint.settings'
const RESTORE_KEY = 'setpoint.restore'
let recovery: Promise<void> | null = null

// A restore journal survives a process exit between AsyncStorage writes. Replay
// it before exposing disk records, then remove it only after all writes succeed.
async function recoverRestore(): Promise<void> {
  if (!recovery) recovery = (async () => {
    const raw = await AsyncStorage.getItem(RESTORE_KEY)
    if (!raw) return
    const pending = JSON.parse(raw) as { players: PlayerRecord[]; matches: MatchRecord[]; settings: SettingsRecord }
    if (!Array.isArray(pending.players) || !Array.isArray(pending.matches) || !pending.matches.every(m => isMatchState(m.state)) || !pending.settings) throw new Error('Invalid pending restore')
    await writeJson(PLAYERS_KEY, pending.players)
    await writeJson(MATCHES_KEY, pending.matches)
    await writeJson(SETTINGS_KEY, pending.settings)
    await AsyncStorage.removeItem(RESTORE_KEY)
  })().catch(error => { recovery = null; throw error })
  return recovery
}

export interface SettingsRecord extends CommonSettings { hapticsEnabled: boolean }

export const defaultSettings: SettingsRecord = { ...commonSettings, hapticsEnabled: true }

async function readJson<T>(key: string, fallback: T): Promise<T> {
  await recoverRestore()
  const raw = await AsyncStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error('Invalid saved data')
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value))
}

const settingsStore = createSettingsStore(defaultSettings, () => readJson(SETTINGS_KEY, null), next => writeJson(SETTINGS_KEY, next))
export const { getSettings, saveSettings } = settingsStore

let playersLoaded = false
const playersById = new Map<string, PlayerRecord>()
let playersWriteChain = Promise.resolve()

function enqueuePlayersTask<T>(task: () => Promise<T>): Promise<T> {
  const run = playersWriteChain.then(task, task)
  playersWriteChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function hydratePlayers(): Promise<void> {
  await recoverRestore()
  if (playersLoaded) return
  const fromDisk = await readJson<PlayerRecord[]>(PLAYERS_KEY, [])
  for (const player of fromDisk) {
    if (!playersById.has(player.id)) {
      playersById.set(player.id, player)
    }
  }
  playersLoaded = true
}

async function persistPlayersToDisk(): Promise<void> {
  await hydratePlayers()
  await writeJson(PLAYERS_KEY, [...playersById.values()])
}

export async function upsertPlayer(name: string, id?: string): Promise<PlayerRecord> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Player name required')
  return enqueuePlayersTask(async () => {
    await hydratePlayers()
    if (id) {
      const existing = playersById.get(id)
      if (existing) {
        const updated = { ...existing, name: trimmed }
        playersById.set(id, updated)
        await persistPlayersToDisk()
        return updated
      }
    }
    const player: PlayerRecord = {
      id: id ?? createId(),
      name: trimmed,
      createdAt: Date.now(),
    }
    playersById.set(player.id, player)
    await persistPlayersToDisk()
    return player
  })
}

export async function listPlayers(): Promise<PlayerRecord[]> {
  return enqueuePlayersTask(async () => {
    await hydratePlayers()
    await hydrateMatches()
    const recovered = recoverPlayerProfiles([...playersById.values()], [...matchesById.values()])
    for (const player of recovered) playersById.set(player.id, player)
    await persistPlayersToDisk()
    return [...playersById.values()].sort((a, b) => a.name.localeCompare(b.name))
  })
}

/**
 * In-memory match map so a live point is readable immediately, even while
 * AsyncStorage is still flushing. Hydrate from disk without clobbering newer
 * in-memory writes. Queue disk writes so two overlapping saves cannot lose the
 * match-winning point.
 */
let matchesLoaded = false
const matchesById = new Map<string, MatchRecord>()
let matchesWriteChain = Promise.resolve()

function enqueueMatchesWriteResult<T>(task: () => Promise<T>): Promise<T> {
  const run = matchesWriteChain.then(task, task)
  matchesWriteChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function hydrateMatches(): Promise<void> {
  await recoverRestore()
  if (matchesLoaded) return
  const fromDisk = await readJson<MatchRecord[]>(MATCHES_KEY, [])
  if (!Array.isArray(fromDisk) || fromDisk.some(match => !isMatchState(match.state))) throw new Error('Invalid saved matches')
  for (const match of fromDisk) {
    if (!matchesById.has(match.id)) {
      matchesById.set(match.id, match)
    }
  }
  matchesLoaded = true
}

async function persistMatchesToDisk(): Promise<void> {
  await hydrateMatches()
  await writeJson(MATCHES_KEY, [...matchesById.values()])
}

export async function saveMatch(record: MatchRecord): Promise<void> {
  await enqueueMatchesWriteResult(async () => {
    await hydrateMatches()
    const previous = matchesById.get(record.id)
    matchesById.set(record.id,record)
    try { await persistMatchesToDisk() }
    catch (error) { if (previous) matchesById.set(record.id,previous); else matchesById.delete(record.id); throw error }
  })
}

export async function getMatch(id: string): Promise<MatchRecord | undefined> {
  await matchesWriteChain
  await hydrateMatches()
  return matchesById.get(id)
}

export async function listMatches(): Promise<MatchRecord[]> {
  await matchesWriteChain
  await hydrateMatches()
  return [...matchesById.values()].sort((a,b) => b.updatedAt-a.updatedAt)
}

export async function deleteMatch(id: string): Promise<void> {
  await enqueueMatchesWriteResult(async () => {
    await hydrateMatches()
    const previous = matchesById.get(id)
    matchesById.delete(id)
    try { await persistMatchesToDisk() }
    catch (error) { if (previous) matchesById.set(id,previous); throw error }
  })
}

export async function createBackup(): Promise<SetPointBackup> {
  const [players, matches, settings] = await Promise.all([
    listPlayers(),
    listMatches(),
    getSettings(),
  ])
  return buildBackup({ players, matches, settings, exportedAt: Date.now() })
}

export async function applyBackup(backup: SetPointBackup): Promise<MergeBackupResult> {
  return settingsStore.withSettings(settings => enqueuePlayersTask(() => enqueueMatchesWriteResult(async () => {
    await hydratePlayers(); await hydrateMatches()
    const merged = mergeBackup({ currentPlayers: [...playersById.values()], currentMatches: [...matchesById.values()], currentSettings: settings, backup })
    const nextSettings = { ...settings, ...merged.settings, id: 'settings' as const }
    await writeJson(RESTORE_KEY, { players: merged.players, matches: merged.matches, settings: nextSettings })
    try {
      await writeJson(PLAYERS_KEY, merged.players)
      await writeJson(MATCHES_KEY, merged.matches)
      await writeJson(SETTINGS_KEY, nextSettings)
      await AsyncStorage.removeItem(RESTORE_KEY)
    } catch (error) {
      // Do not permit a later save to overwrite a partially restored archive.
      recovery = null; playersLoaded = false; matchesLoaded = false
      playersById.clear(); matchesById.clear()
      throw error
    }
    playersById.clear(); matchesById.clear()
    for (const player of merged.players) playersById.set(player.id,player)
    for (const match of merged.matches) matchesById.set(match.id,match)
    return merged
  })))
}

export async function mergePlayers(source: string, target: string): Promise<void> {
  await enqueuePlayersTask(async () => {
    await hydratePlayers(); await matchesWriteChain; await hydrateMatches()
    const merged = mergePlayerProfiles([...playersById.values()], [...matchesById.values()], source, target)
    // Publish the new identity only after disk accepts it.
    await writeJson(PLAYERS_KEY, merged)
    playersById.clear()
    for (const p of merged) playersById.set(p.id, p)
  })
}
