/**
 * Web persistence: Dexie (IndexedDB) for players, matches, and settings.
 * Stored match shape is `MatchRecord` from `shared/records.ts`.
 */
import Dexie, { type EntityTable } from 'dexie'
import {
  buildBackup,
  type MergeBackupResult,
  mergeBackup,
  type SetPointBackup,
} from '../../shared/backup'
import { isMatchState } from '../../shared/engine/validation'
import type { MatchRecord, PlayerRecord } from '../../shared/records'
import { type CommonSettings, commonSettings, createSettingsStore } from '../../shared/settings'
import { mergePlayerProfiles, recoverPlayerProfiles } from '../../shared/utils/players'
import { createId } from '../engine/helpers'
import type { DesignStyleId } from '../themes'

export type { MatchRecord, PlayerRecord }

export interface SettingsRecord extends CommonSettings {
  designStyle?: DesignStyleId
}

class SetPointDB extends Dexie {
  players!: EntityTable<PlayerRecord, 'id'>
  matches!: EntityTable<MatchRecord, 'id'>
  settings!: EntityTable<SettingsRecord, 'id'>

  constructor() {
    super('setpoint')
    this.version(1).stores({
      players: 'id, name, createdAt',
      matches: 'id, createdAt, updatedAt, completedAt',
      settings: 'id',
    })
  }
}

export const db = new SetPointDB()

let playersWriteChain = Promise.resolve()

function enqueuePlayersTask<T>(task: () => Promise<T>): Promise<T> {
  const run = playersWriteChain.then(task, task)
  playersWriteChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export const defaultSettings: SettingsRecord = { ...commonSettings, designStyle: 'classic' }

const settingsStore = createSettingsStore(
  defaultSettings,
  () => db.settings.get('settings'),
  (next) => db.settings.put(next),
)
export const { getSettings, saveSettings } = settingsStore

export async function upsertPlayer(name: string, id?: string): Promise<PlayerRecord> {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Player name required')
  return enqueuePlayersTask(async () => {
    if (id) {
      const existing = await db.players.get(id)
      if (existing) {
        const updated = { ...existing, name: trimmed }
        await db.players.put(updated)
        return updated
      }
    }
    const player: PlayerRecord = {
      id: id ?? createId(),
      name: trimmed,
      createdAt: Date.now(),
    }
    await db.players.put(player)
    return player
  })
}

export async function listPlayers(): Promise<PlayerRecord[]> {
  return enqueuePlayersTask(async () => {
    const players = recoverPlayerProfiles(await db.players.toArray(), await db.matches.toArray())
    await db.players.bulkPut(players)
    return players
  })
}

export async function mergePlayers(source: string, target: string): Promise<void> {
  await enqueuePlayersTask(() =>
    db.transaction('rw', db.players, db.matches, async () => {
      const players = mergePlayerProfiles(
        await db.players.toArray(),
        await db.matches.toArray(),
        source,
        target,
      )
      await db.players.bulkPut(players)
    }),
  )
}

export async function saveMatch(record: MatchRecord): Promise<void> {
  await db.matches.put(record)
}

export async function getMatch(id: string): Promise<MatchRecord | undefined> {
  const record = await db.matches.get(id)
  if (record && !isMatchState(record.state)) throw new Error('Invalid saved match')
  return record
}

export async function listMatches(): Promise<MatchRecord[]> {
  const records = await db.matches.orderBy('updatedAt').reverse().toArray()
  if (records.some((record) => !isMatchState(record.state))) throw new Error('Invalid saved match')
  return records
}

export async function deleteMatch(id: string): Promise<void> {
  await db.matches.delete(id)
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
  // Flush settings migration before the multi-table transaction.
  return settingsStore.withSettings(() =>
    enqueuePlayersTask(() =>
      db.transaction('rw', db.players, db.matches, db.settings, async () => {
        const [players, matches, storedSettings] = await Promise.all([
          db.players.toArray(),
          db.matches.toArray(),
          db.settings.get('settings'),
        ])
        const settings = { ...defaultSettings, ...storedSettings }
        const merged = mergeBackup({
          currentPlayers: players,
          currentMatches: matches,
          currentSettings: settings,
          backup,
        })
        await db.players.bulkPut(merged.players)
        await db.matches.bulkPut(merged.matches)
        await db.settings.put({ ...settings, ...merged.settings, id: 'settings' })
        return merged
      }),
    ),
  )
}
